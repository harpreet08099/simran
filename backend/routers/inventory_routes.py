import uuid
import random
import string
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
from db import db
from auth import get_current_user, resolve_team_id

router = APIRouter(tags=["inventory"])
TxType = Literal["stock_in", "stock_out", "move", "adjust", "return"]


class ItemIn(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    min_stock: Optional[int] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    initial_qty: Optional[int] = None
    location: Optional[str] = None


class TxItemIn(BaseModel):
    item_id: str
    qty: int = Field(ge=0)


class TxIn(BaseModel):
    type: TxType
    location: str
    to_location: Optional[str] = None
    memo: Optional[str] = None
    items: List[TxItemIn]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_sku() -> str:
    return "SKU-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


async def _team(tid: str) -> dict:
    team = await db.teams.find_one({"id": tid}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


async def _apply_transaction(tid: str, user: dict, body: TxIn) -> dict:
    team = await _team(tid)
    locations = team.get("locations", [])
    if body.location not in locations:
        raise HTTPException(status_code=400, detail="Unknown location")
    if body.type == "move":
        if not body.to_location or body.to_location not in locations:
            raise HTTPException(status_code=400, detail="Destination location required")
        if body.to_location == body.location:
            raise HTTPException(status_code=400, detail="Source and destination must differ")
    if body.type == "adjust" and not (body.memo or "").strip():
        raise HTTPException(status_code=400, detail="A reason (memo) is required for Adjust Stock")
    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one item")

    planned = []
    for line in body.items:
        item = await db.items.find_one({"id": line.item_id, "team_id": tid, "is_archived": False}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        stock = dict(item.get("stock", {}))
        before = int(stock.get(body.location, 0))
        if body.type in ("stock_in", "return"):
            if line.qty <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
            after, delta = before + line.qty, line.qty
            stock[body.location] = after
        elif body.type == "stock_out":
            if line.qty <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
            if line.qty > before:
                raise HTTPException(status_code=400, detail=f"Not enough stock for {item['name']} at {body.location}")
            after, delta = before - line.qty, -line.qty
            stock[body.location] = after
        elif body.type == "move":
            if line.qty <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
            if line.qty > before:
                raise HTTPException(status_code=400, detail=f"Not enough stock for {item['name']} at {body.location}")
            after, delta = before - line.qty, 0
            stock[body.location] = after
            stock[body.to_location] = int(stock.get(body.to_location, 0)) + line.qty
        else:
            after, delta = line.qty, line.qty - before
            stock[body.location] = after
        planned.append((item, stock, {"item_id": item["id"], "name": item["name"], "category": item.get("category"),
                                      "brand": item.get("brand"), "qty": line.qty, "before": before,
                                      "after": after, "delta": delta}))

    for item, stock, _ in planned:
        await db.items.update_one({"id": item["id"]}, {"$set": {"stock": stock, "quantity": sum(stock.values()),
                                                                "updated_at": _now().isoformat()}})
    tx = {"id": str(uuid.uuid4()), "team_id": tid, "type": body.type, "location": body.location,
          "to_location": body.to_location, "memo": (body.memo or "").strip(), "items": [p[2] for p in planned],
          "total_qty": sum(p[2]["qty"] for p in planned), "user_id": user["id"], "user_name": user.get("name") or user["email"],
          "created_at": _now().isoformat()}
    await db.transactions.insert_one(tx)
    tx.pop("_id", None)
    return tx


# ---------- Items ----------
@router.get("/items")
async def list_items(q: Optional[str] = None, low_stock: bool = False, team_id: Optional[str] = None,
                     user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    query: dict = {"team_id": tid, "is_archived": False}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"sku": {"$regex": q, "$options": "i"}},
                        {"barcode": {"$regex": q, "$options": "i"}}]
    items = await db.items.find(query, {"_id": 0}).sort("name", 1).to_list(2000)
    if low_stock:
        items = [i for i in items if i.get("min_stock") is not None and i["quantity"] <= i["min_stock"]]
    return items


@router.post("/items")
async def create_item(body: ItemIn, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    team = await _team(tid)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Item name is required")
    sku = (body.sku or "").strip() or _gen_sku()
    if await db.items.find_one({"team_id": tid, "sku": sku, "is_archived": False}):
        raise HTTPException(status_code=400, detail="SKU already exists")
    barcode = (body.barcode or "").strip() or None
    if barcode and await db.items.find_one({"team_id": tid, "barcode": barcode, "is_archived": False}):
        raise HTTPException(status_code=400, detail="Barcode already assigned to another item")
    doc = {"id": str(uuid.uuid4()), "team_id": tid, "name": body.name.strip(), "sku": sku, "barcode": barcode,
           "category": (body.category or "").strip() or None, "brand": (body.brand or "").strip() or None,
           "cost_price": body.cost_price, "selling_price": body.selling_price, "min_stock": body.min_stock,
           "unit": (body.unit or "").strip() or None, "description": (body.description or "").strip() or None,
           "stock": {}, "quantity": 0, "is_archived": False, "created_by": user["id"],
           "created_at": _now().isoformat(), "updated_at": _now().isoformat()}
    await db.items.insert_one(doc)
    doc.pop("_id", None)
    if body.initial_qty and body.initial_qty > 0:
        location = body.location or team["locations"][0]
        tx = TxIn(type="adjust", location=location, memo="Initial Quantity",
                  items=[TxItemIn(item_id=doc["id"], qty=body.initial_qty)])
        await _apply_transaction(tid, user, tx)
        doc = await db.items.find_one({"id": doc["id"]}, {"_id": 0})
    return doc


@router.get("/items/{item_id}")
async def get_item(item_id: str, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    item = await db.items.find_one({"id": item_id, "team_id": tid}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}")
async def update_item(item_id: str, body: ItemIn, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    item = await db.items.find_one({"id": item_id, "team_id": tid, "is_archived": False})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    sku = (body.sku or "").strip() or item["sku"]
    if sku != item["sku"] and await db.items.find_one({"team_id": tid, "sku": sku, "is_archived": False}):
        raise HTTPException(status_code=400, detail="SKU already exists")
    barcode = (body.barcode or "").strip() or None
    if barcode and barcode != item.get("barcode") and await db.items.find_one(
            {"team_id": tid, "barcode": barcode, "is_archived": False}):
        raise HTTPException(status_code=400, detail="Barcode already assigned to another item")
    update = {"name": body.name.strip(), "sku": sku, "barcode": barcode,
              "category": (body.category or "").strip() or None, "brand": (body.brand or "").strip() or None,
              "cost_price": body.cost_price, "selling_price": body.selling_price, "min_stock": body.min_stock,
              "unit": (body.unit or "").strip() or None, "description": (body.description or "").strip() or None,
              "updated_at": _now().isoformat()}
    await db.items.update_one({"id": item_id}, {"$set": update})
    return await db.items.find_one({"id": item_id}, {"_id": 0})


@router.delete("/items/{item_id}")
async def delete_item(item_id: str, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    res = await db.items.update_one({"id": item_id, "team_id": tid}, {"$set": {"is_archived": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


# ---------- Transactions ----------
@router.get("/transactions")
async def list_transactions(type: Optional[str] = None, item_id: Optional[str] = None, team_id: Optional[str] = None,
                            limit: int = 200, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    query: dict = {"team_id": tid}
    if type:
        query["type"] = type
    if item_id:
        query["items.item_id"] = item_id
    return await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)


@router.post("/transactions")
async def create_transaction(body: TxIn, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    return await _apply_transaction(tid, user, body)


@router.get("/transactions/{tx_id}")
async def get_transaction(tx_id: str, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    tx = await db.transactions.find_one({"id": tx_id, "team_id": tid}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


# ---------- Dashboard ----------
@router.get("/dashboard")
async def dashboard(team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    now = _now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    items = await db.items.find({"team_id": tid, "is_archived": False}, {"_id": 0, "quantity": 1, "min_stock": 1}).to_list(5000)
    total_now = sum(i.get("quantity", 0) for i in items)
    low_stock = sum(1 for i in items if i.get("min_stock") is not None and i["quantity"] <= i["min_stock"])
    txs = await db.transactions.find({"team_id": tid, "created_at": {"$gte": yesterday_start.isoformat()}},
                                     {"_id": 0}).to_list(5000)

    def summarize(start: datetime, end: datetime, total: int) -> dict:
        s_in = s_out = 0
        for tx in txs:
            ts = datetime.fromisoformat(tx["created_at"])
            if start <= ts < end:
                if tx["type"] == "stock_in":
                    s_in += tx["total_qty"]
                elif tx["type"] == "stock_out":
                    s_out += tx["total_qty"]
        return {"date": start.isoformat(), "total": total, "stock_in": s_in, "stock_out": s_out}

    net_today = sum(li["delta"] for tx in txs for li in tx["items"]
                    if datetime.fromisoformat(tx["created_at"]) >= today_start)
    return {"today": summarize(today_start, now + timedelta(days=1), total_now),
            "yesterday": summarize(yesterday_start, today_start, total_now - net_today),
            "low_stock_count": low_stock, "item_count": len(items)}



# ---------- Reports: stock as of a past date ----------
@router.get("/reports/stock-by-date")
async def stock_by_date(date: str, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Reconstruct each item's quantity as of the END of the given date (YYYY-MM-DD)."""
    tid = await resolve_team_id(user, team_id)
    try:
        day = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    end_of_day = day.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    items = await db.items.find({"team_id": tid, "is_archived": False}, {"_id": 0}).sort("name", 1).to_list(5000)
    # Sum deltas of transactions AFTER end_of_day, then subtract from current quantity.
    future = await db.transactions.find(
        {"team_id": tid, "created_at": {"$gte": end_of_day.isoformat()}}, {"_id": 0}).to_list(20000)
    delta_after: dict = {}
    for tx in future:
        for li in tx["items"]:
            delta_after[li["item_id"]] = delta_after.get(li["item_id"], 0) + li.get("delta", 0)
    result = []
    for it in items:
        past_qty = int(it.get("quantity", 0)) - delta_after.get(it["id"], 0)
        result.append({"id": it["id"], "name": it["name"], "sku": it.get("sku"),
                       "category": it.get("category"), "brand": it.get("brand"),
                       "unit": it.get("unit"), "quantity": past_qty})
    return {"date": date, "items": result}


# ---------- Bundles (grouped items) ----------
class BundleItemIn(BaseModel):
    item_id: str
    qty: int = Field(ge=1)


class BundleIn(BaseModel):
    name: str
    items: List[BundleItemIn]


@router.get("/bundles")
async def list_bundles(team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    return await db.bundles.find({"team_id": tid}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/bundles")
async def create_bundle(body: BundleIn, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Bundle name is required")
    if not body.items:
        raise HTTPException(status_code=400, detail="Add at least one item to the bundle")
    lines = []
    for li in body.items:
        item = await db.items.find_one({"id": li.item_id, "team_id": tid, "is_archived": False}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        lines.append({"item_id": item["id"], "name": item["name"], "sku": item.get("sku"), "qty": li.qty})
    doc = {"id": str(uuid.uuid4()), "team_id": tid, "name": body.name.strip(), "items": lines,
           "created_by": user["id"], "created_at": _now().isoformat()}
    await db.bundles.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/bundles/{bundle_id}")
async def delete_bundle(bundle_id: str, team_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    tid = await resolve_team_id(user, team_id)
    res = await db.bundles.delete_one({"id": bundle_id, "team_id": tid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return {"ok": True}
