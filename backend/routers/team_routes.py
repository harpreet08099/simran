import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
from db import db
from auth import (hash_password, get_current_user, require_roles, resolve_team_id, access_info,
                  ROLE_MAIN, ROLE_SUB, ROLE_MEMBER)

router = APIRouter(tags=["team"])


class SubAdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    shop_name: str
    access_type: Literal["lifetime", "limited"] = "lifetime"
    days: Optional[int] = None


class SubAdminUpdate(BaseModel):
    name: Optional[str] = None
    shop_name: Optional[str] = None
    password: Optional[str] = None
    access_type: Optional[Literal["lifetime", "limited"]] = None
    days: Optional[int] = None
    is_active: Optional[bool] = None


class MemberCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class TeamUpdate(BaseModel):
    name: str


class LocationIn(BaseModel):
    name: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _access_end(days: Optional[int]) -> str:
    if not days or days <= 0:
        raise HTTPException(status_code=400, detail="Days must be greater than 0 for limited access")
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _strip(u: dict) -> dict:
    u.pop("password_hash", None)
    u["access"] = access_info(u)
    return u


async def _email_free(email: str):
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")


# ---------- Main admin: Sub Admins ----------
@router.get("/admin/sub-admins")
async def list_sub_admins(user: dict = Depends(require_roles(ROLE_MAIN))):
    subs = await db.users.find({"role": ROLE_SUB}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    for s in subs:
        s["access"] = access_info(s)
        s["member_count"] = await db.users.count_documents({"role": ROLE_MEMBER, "sub_admin_id": s["id"]})
        team = await db.teams.find_one({"id": s["id"]}, {"_id": 0})
        s["shop_name"] = team["name"] if team else ""
    return subs


@router.post("/admin/sub-admins")
async def create_sub_admin(body: SubAdminCreate, user: dict = Depends(require_roles(ROLE_MAIN))):
    email = body.email.lower().strip()
    await _email_free(email)
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    uid = str(uuid.uuid4())
    doc = {"id": uid, "email": email, "password_hash": hash_password(body.password), "name": body.name.strip(),
           "role": ROLE_SUB, "sub_admin_id": None, "is_active": True, "access_type": body.access_type,
           "access_end": _access_end(body.days) if body.access_type == "limited" else None,
           "created_by": user["id"], "created_at": _now()}
    await db.users.insert_one(doc)
    await db.teams.insert_one({"id": uid, "name": body.shop_name.strip(), "locations": ["Default Location"], "created_at": _now()})
    doc = {k: v for k, v in doc.items() if k != "_id"}
    out = _strip(doc)
    out["shop_name"] = body.shop_name.strip()
    out["member_count"] = 0
    return out


@router.put("/admin/sub-admins/{sub_id}")
async def update_sub_admin(sub_id: str, body: SubAdminUpdate, user: dict = Depends(require_roles(ROLE_MAIN))):
    sub = await db.users.find_one({"id": sub_id, "role": ROLE_SUB})
    if not sub:
        raise HTTPException(status_code=404, detail="Sub admin not found")
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if body.is_active is not None:
        update["is_active"] = body.is_active
    if body.access_type == "lifetime":
        update["access_type"] = "lifetime"
        update["access_end"] = None
    elif body.access_type == "limited":
        update["access_type"] = "limited"
        update["access_end"] = _access_end(body.days)
    if update:
        await db.users.update_one({"id": sub_id}, {"$set": update})
    if body.shop_name is not None:
        await db.teams.update_one({"id": sub_id}, {"$set": {"name": body.shop_name.strip()}})
    return {"ok": True}


@router.delete("/admin/sub-admins/{sub_id}")
async def delete_sub_admin(sub_id: str, user: dict = Depends(require_roles(ROLE_MAIN))):
    res = await db.users.delete_one({"id": sub_id, "role": ROLE_SUB})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sub admin not found")
    await db.users.delete_many({"role": ROLE_MEMBER, "sub_admin_id": sub_id})
    await db.teams.delete_one({"id": sub_id})
    await db.items.delete_many({"team_id": sub_id})
    await db.transactions.delete_many({"team_id": sub_id})
    return {"ok": True}


# ---------- Team (sub admin / main admin) ----------
@router.get("/team")
async def get_team(team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    team = await db.teams.find_one({"id": tid}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/team")
async def update_team(body: TeamUpdate, team_id: Optional[str] = None,
                      user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    await db.teams.update_one({"id": tid}, {"$set": {"name": body.name.strip()}})
    return {"ok": True}


@router.post("/team/locations")
async def add_location(body: LocationIn, team_id: Optional[str] = None,
                       user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Location name required")
    team = await db.teams.find_one({"id": tid})
    if name in team.get("locations", []):
        raise HTTPException(status_code=400, detail="Location already exists")
    await db.teams.update_one({"id": tid}, {"$push": {"locations": name}})
    return {"ok": True}


@router.delete("/team/locations/{name}")
async def delete_location(name: str, team_id: Optional[str] = None,
                          user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    team = await db.teams.find_one({"id": tid})
    if len(team.get("locations", [])) <= 1:
        raise HTTPException(status_code=400, detail="At least one location is required")
    has_stock = await db.items.find_one({"team_id": tid, f"stock.{name}": {"$gt": 0}})
    if has_stock:
        raise HTTPException(status_code=400, detail="Location still has stock. Move it out first.")
    await db.teams.update_one({"id": tid}, {"$pull": {"locations": name}})
    return {"ok": True}


# ---------- Members ----------
@router.get("/team/members")
async def list_members(team_id: Optional[str] = None, user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    members = await db.users.find({"role": ROLE_MEMBER, "sub_admin_id": tid},
                                  {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return members


@router.post("/team/members")
async def create_member(body: MemberCreate, team_id: Optional[str] = None,
                        user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    email = body.email.lower().strip()
    await _email_free(email)
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    count = await db.users.count_documents({"role": ROLE_MEMBER, "sub_admin_id": tid})
    if count >= 20:
        raise HTTPException(status_code=400, detail="Member limit (20) reached")
    doc = {"id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(body.password),
           "name": body.name.strip(), "role": ROLE_MEMBER, "sub_admin_id": tid, "is_active": True,
           "created_by": user["id"], "created_at": _now()}
    await db.users.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("_id", "password_hash")}


@router.put("/team/members/{member_id}")
async def update_member(member_id: str, body: MemberUpdate, team_id: Optional[str] = None,
                        user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    query = {"id": member_id, "role": ROLE_MEMBER}
    if user["role"] != ROLE_MAIN:
        query["sub_admin_id"] = tid
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if body.is_active is not None:
        update["is_active"] = body.is_active
    res = await db.users.update_one(query, {"$set": update}) if update else None
    if res is not None and res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"ok": True}


@router.delete("/team/members/{member_id}")
async def delete_member(member_id: str, team_id: Optional[str] = None,
                        user: dict = Depends(require_roles(ROLE_MAIN, ROLE_SUB))):
    tid = await resolve_team_id(user, team_id)
    query = {"id": member_id, "role": ROLE_MEMBER}
    if user["role"] != ROLE_MAIN:
        query["sub_admin_id"] = tid
    res = await db.users.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"ok": True}
