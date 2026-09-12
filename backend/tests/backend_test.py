"""End-to-end backend API tests for the inventory app.

Covers: auth, main-admin sub-admins CRUD, sub-admin members, revocation cascade,
items CRUD & search, transactions (stock_in/out/move/adjust), dashboard, low_stock,
team locations, main-admin cross-team acts, sub-admin isolation.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "harpreetsinghhappy7080@gmail.com"
ADMIN_PASSWORD = "@Harpreet7518"
TS = int(time.time())


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_login():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL.upper(), "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "main_admin"
    assert data["team"]["name"] == "Simran Mobile"
    assert data["access_token"] and data["refresh_token"]
    return data


@pytest.fixture(scope="module")
def admin_token(admin_login):
    return admin_login["access_token"]


# ---------- AUTH ----------
class TestAuth:
    def test_login_case_insensitive(self, admin_login):
        assert admin_login["user"]["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self):
        # Use unique email to avoid brute force lockout on admin
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "not-the-password"})
        assert r.status_code == 401

    def test_me(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_auth_headers(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "main_admin"

    def test_refresh(self, admin_login):
        r = requests.post(f"{API}/auth/refresh", json={"refresh_token": admin_login["refresh_token"]})
        assert r.status_code == 200
        assert r.json().get("access_token")


# ---------- SUB ADMINS + MEMBERS ----------
@pytest.fixture(scope="module")
def limited_sub(admin_token):
    email = f"test-sub-limited-{TS}@example.com"
    r = requests.post(f"{API}/admin/sub-admins", headers=_auth_headers(admin_token),
                      json={"email": email, "password": "password123", "name": "Limited Sub",
                            "shop_name": "Limited Shop", "access_type": "limited", "days": 10})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access"]["access_type"] == "limited"
    assert 9 <= body["access"]["days_left"] <= 10
    body["_password"] = "password123"
    body["_email"] = email
    return body


@pytest.fixture(scope="module")
def lifetime_sub(admin_token):
    email = f"test-sub-life-{TS}@example.com"
    r = requests.post(f"{API}/admin/sub-admins", headers=_auth_headers(admin_token),
                      json={"email": email, "password": "password123", "name": "Life Sub",
                            "shop_name": "Life Shop", "access_type": "lifetime"})
    assert r.status_code == 200, r.text
    body = r.json()
    body["_password"] = "password123"
    body["_email"] = email
    return body


@pytest.fixture(scope="module")
def sub_login(limited_sub):
    r = requests.post(f"{API}/auth/login", json={"email": limited_sub["_email"], "password": limited_sub["_password"]})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["role"] == "sub_admin"
    assert d["team"]["name"] == "Limited Shop"
    assert d["team"]["locations"] == ["Default Location"]
    return d


class TestSubAdmins:
    def test_list_contains_both(self, admin_token, limited_sub, lifetime_sub):
        r = requests.get(f"{API}/admin/sub-admins", headers=_auth_headers(admin_token))
        assert r.status_code == 200
        ids = {s["id"]: s for s in r.json()}
        assert limited_sub["id"] in ids and lifetime_sub["id"] in ids
        assert ids[limited_sub["id"]]["shop_name"] == "Limited Shop"
        assert "member_count" in ids[limited_sub["id"]]

    def test_sub_login_works(self, sub_login):
        assert sub_login["access_token"]

    def test_lifetime_login(self, lifetime_sub):
        r = requests.post(f"{API}/auth/login", json={"email": lifetime_sub["_email"], "password": lifetime_sub["_password"]})
        assert r.status_code == 200


# Member fixture
@pytest.fixture(scope="module")
def member(sub_login):
    email = f"test-mem-{TS}@example.com"
    r = requests.post(f"{API}/team/members", headers=_auth_headers(sub_login["access_token"]),
                      json={"email": email, "password": "password123", "name": "Mem"})
    assert r.status_code == 200, r.text
    d = r.json()
    d["_password"] = "password123"
    d["_email"] = email
    return d


@pytest.fixture(scope="module")
def member_login(member, sub_login):
    r = requests.post(f"{API}/auth/login", json={"email": member["_email"], "password": member["_password"]})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["role"] == "member"
    assert d["user"]["team_id"] == sub_login["user"]["id"]
    return d


class TestMembers:
    def test_member_forbidden_endpoints(self, member_login):
        t = member_login["access_token"]
        r = requests.get(f"{API}/team/members", headers=_auth_headers(t))
        assert r.status_code == 403
        r = requests.get(f"{API}/admin/sub-admins", headers=_auth_headers(t))
        assert r.status_code == 403

    def test_member_can_list_items(self, member_login):
        r = requests.get(f"{API}/items", headers=_auth_headers(member_login["access_token"]))
        assert r.status_code == 200


# ---------- REVOCATION CASCADE ----------
class TestRevocation:
    def test_cascade(self, admin_token, limited_sub, member):
        sid = limited_sub["id"]
        # Get member existing token
        mlogin = requests.post(f"{API}/auth/login", json={"email": member["_email"], "password": member["_password"]}).json()
        mtoken = mlogin["access_token"]

        # Revoke sub
        r = requests.put(f"{API}/admin/sub-admins/{sid}", headers=_auth_headers(admin_token), json={"is_active": False})
        assert r.status_code == 200

        # sub login blocked
        r = requests.post(f"{API}/auth/login", json={"email": limited_sub["_email"], "password": limited_sub["_password"]})
        assert r.status_code == 403

        # member login blocked
        r = requests.post(f"{API}/auth/login", json={"email": member["_email"], "password": member["_password"]})
        assert r.status_code == 403

        # existing member token blocked on /items
        r = requests.get(f"{API}/items", headers=_auth_headers(mtoken))
        assert r.status_code == 403

        # Restore
        r = requests.put(f"{API}/admin/sub-admins/{sid}", headers=_auth_headers(admin_token), json={"is_active": True})
        assert r.status_code == 200
        r = requests.post(f"{API}/auth/login", json={"email": limited_sub["_email"], "password": limited_sub["_password"]})
        assert r.status_code == 200
        r = requests.post(f"{API}/auth/login", json={"email": member["_email"], "password": member["_password"]})
        assert r.status_code == 200

    def test_switch_access_type(self, admin_token, limited_sub):
        sid = limited_sub["id"]
        r = requests.put(f"{API}/admin/sub-admins/{sid}", headers=_auth_headers(admin_token),
                         json={"access_type": "limited", "days": 1})
        assert r.status_code == 200
        r = requests.put(f"{API}/admin/sub-admins/{sid}", headers=_auth_headers(admin_token),
                         json={"access_type": "lifetime"})
        assert r.status_code == 200

    def test_member_toggle_blocks_login(self, sub_login, member):
        st = sub_login["access_token"]
        # deactivate
        r = requests.put(f"{API}/team/members/{member['id']}", headers=_auth_headers(st), json={"is_active": False})
        assert r.status_code == 200
        r = requests.post(f"{API}/auth/login", json={"email": member["_email"], "password": member["_password"]})
        assert r.status_code == 403
        # restore
        r = requests.put(f"{API}/team/members/{member['id']}", headers=_auth_headers(st), json={"is_active": True})
        assert r.status_code == 200


# ---------- ITEMS ----------
@pytest.fixture(scope="module")
def sub_token(sub_login, admin_token, limited_sub):
    # Re-login after revocation tests may have run
    r = requests.post(f"{API}/auth/login", json={"email": limited_sub["_email"], "password": "password123"})
    if r.status_code != 200:
        # ensure active
        requests.put(f"{API}/admin/sub-admins/{limited_sub['id']}", headers=_auth_headers(admin_token),
                     json={"is_active": True, "access_type": "lifetime"})
        r = requests.post(f"{API}/auth/login", json={"email": limited_sub["_email"], "password": "password123"})
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def item(sub_token):
    r = requests.post(f"{API}/items", headers=_auth_headers(sub_token),
                      json={"name": f"TEST_ItemA_{TS}", "sku": f"TESTSKU-{TS}", "cost_price": 10.0,
                            "selling_price": 20.0, "min_stock": 5, "initial_qty": 50})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["quantity"] == 50
    return d


class TestItems:
    def test_initial_tx_created(self, sub_token, item):
        r = requests.get(f"{API}/transactions", headers=_auth_headers(sub_token), params={"item_id": item["id"]})
        assert r.status_code == 200
        txs = r.json()
        assert any(tx["type"] == "adjust" and tx["memo"] == "Initial Quantity" for tx in txs)

    def test_duplicate_sku(self, sub_token, item):
        r = requests.post(f"{API}/items", headers=_auth_headers(sub_token),
                          json={"name": "another", "sku": item["sku"]})
        assert r.status_code == 400

    def test_search(self, sub_token, item):
        r = requests.get(f"{API}/items", headers=_auth_headers(sub_token), params={"q": "TEST_ItemA"})
        assert r.status_code == 200
        assert any(i["id"] == item["id"] for i in r.json())

    def test_update(self, sub_token, item):
        r = requests.put(f"{API}/items/{item['id']}", headers=_auth_headers(sub_token),
                         json={"name": item["name"], "sku": item["sku"], "min_stock": 10})
        assert r.status_code == 200
        assert r.json()["min_stock"] == 10

    def test_team_isolation(self, sub_token, admin_token):
        # create item in main admin's team
        r = requests.post(f"{API}/items", headers=_auth_headers(admin_token),
                          json={"name": f"TEST_MainOnly_{TS}", "initial_qty": 1})
        assert r.status_code == 200
        main_item_id = r.json()["id"]
        r = requests.get(f"{API}/items/{main_item_id}", headers=_auth_headers(sub_token))
        assert r.status_code == 404


# ---------- TRANSACTIONS ----------
class TestTransactions:
    def test_stock_in(self, sub_token, item):
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "stock_in", "location": "Default Location",
                                "items": [{"item_id": item["id"], "qty": 10}]})
        assert r.status_code == 200
        # verify quantity
        d = requests.get(f"{API}/items/{item['id']}", headers=_auth_headers(sub_token)).json()
        assert d["quantity"] == 60

    def test_stock_out_over(self, sub_token, item):
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "stock_out", "location": "Default Location",
                                "items": [{"item_id": item["id"], "qty": 100}]})
        assert r.status_code == 400

    def test_stock_out(self, sub_token, item):
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "stock_out", "location": "Default Location",
                                "items": [{"item_id": item["id"], "qty": 10}]})
        assert r.status_code == 200
        d = requests.get(f"{API}/items/{item['id']}", headers=_auth_headers(sub_token)).json()
        assert d["quantity"] == 50

    def test_adjust_requires_memo(self, sub_token, item):
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "adjust", "location": "Default Location",
                                "items": [{"item_id": item["id"], "qty": 80}]})
        assert r.status_code == 400

    def test_adjust(self, sub_token, item):
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "adjust", "location": "Default Location", "memo": "recount",
                                "items": [{"item_id": item["id"], "qty": 80}]})
        assert r.status_code == 200
        d = requests.get(f"{API}/items/{item['id']}", headers=_auth_headers(sub_token)).json()
        assert d["quantity"] == 80

    def test_move(self, sub_token, item):
        # Add warehouse
        r = requests.post(f"{API}/team/locations", headers=_auth_headers(sub_token), json={"name": "Warehouse"})
        assert r.status_code == 200
        # same source/dest
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "move", "location": "Default Location", "to_location": "Default Location",
                                "items": [{"item_id": item["id"], "qty": 5}]})
        assert r.status_code == 400
        # actual move
        r = requests.post(f"{API}/transactions", headers=_auth_headers(sub_token),
                          json={"type": "move", "location": "Default Location", "to_location": "Warehouse",
                                "items": [{"item_id": item["id"], "qty": 30}]})
        assert r.status_code == 200
        d = requests.get(f"{API}/items/{item['id']}", headers=_auth_headers(sub_token)).json()
        assert d["stock"]["Default Location"] == 50
        assert d["stock"]["Warehouse"] == 30
        assert d["quantity"] == 80

    def test_list_and_filter(self, sub_token):
        r = requests.get(f"{API}/transactions", headers=_auth_headers(sub_token))
        assert r.status_code == 200
        txs = r.json()
        assert len(txs) >= 2
        # newest first
        assert txs[0]["created_at"] >= txs[-1]["created_at"]
        r = requests.get(f"{API}/transactions", headers=_auth_headers(sub_token), params={"type": "stock_out"})
        assert r.status_code == 200
        assert all(t["type"] == "stock_out" for t in r.json())

    def test_get_tx_details(self, sub_token, item):
        txs = requests.get(f"{API}/transactions", headers=_auth_headers(sub_token), params={"item_id": item["id"]}).json()
        tid = txs[0]["id"]
        r = requests.get(f"{API}/transactions/{tid}", headers=_auth_headers(sub_token))
        assert r.status_code == 200
        it = r.json()["items"][0]
        assert "before" in it and "after" in it

    def test_dashboard(self, sub_token):
        r = requests.get(f"{API}/dashboard", headers=_auth_headers(sub_token))
        assert r.status_code == 200
        d = r.json()
        assert "today" in d and "yesterday" in d
        assert d["today"]["total"] >= 0
        assert "low_stock_count" in d

    def test_low_stock(self, sub_token, item):
        # set min_stock high to trigger
        requests.put(f"{API}/items/{item['id']}", headers=_auth_headers(sub_token),
                     json={"name": item["name"], "sku": item["sku"], "min_stock": 999})
        r = requests.get(f"{API}/items", headers=_auth_headers(sub_token), params={"low_stock": "true"})
        assert r.status_code == 200
        assert any(i["id"] == item["id"] for i in r.json())


# ---------- MAIN ADMIN CROSS-TEAM ----------
class TestMainAdminCross:
    def test_main_admin_acts_on_sub_team(self, admin_token, limited_sub):
        sid = limited_sub["id"]
        r = requests.get(f"{API}/team/members", headers=_auth_headers(admin_token), params={"team_id": sid})
        assert r.status_code == 200
        email = f"test-main-mem-{TS}@example.com"
        r = requests.post(f"{API}/team/members?team_id={sid}", headers=_auth_headers(admin_token),
                          json={"email": email, "password": "password123", "name": "MainCreatedMem"})
        assert r.status_code == 200

    def test_delete_sub_cascades(self, admin_token, lifetime_sub):
        sid = lifetime_sub["id"]
        # Add a member to this sub via main admin
        me = f"test-life-mem-{TS}@example.com"
        r = requests.post(f"{API}/team/members?team_id={sid}", headers=_auth_headers(admin_token),
                          json={"email": me, "password": "password123", "name": "L"})
        assert r.status_code == 200
        r = requests.delete(f"{API}/admin/sub-admins/{sid}", headers=_auth_headers(admin_token))
        assert r.status_code == 200
        r = requests.post(f"{API}/auth/login", json={"email": me, "password": "password123"})
        assert r.status_code == 401


# ---------- CLEANUP ----------
def test_zzz_cleanup(admin_token, limited_sub):
    # delete limited sub too (best-effort)
    requests.delete(f"{API}/admin/sub-admins/{limited_sub['id']}", headers=_auth_headers(admin_token))
