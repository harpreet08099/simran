import io
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw
from db import db
from auth import require_roles, ROLE_MAIN

router = APIRouter(tags=["app-config"])
CONFIG_ID = "app"


async def _get_config() -> dict:
    return await db.settings.find_one({"_id": CONFIG_ID}) or {}


def _logo_url(size: int, version: int) -> str:
    return f"/api/app-config/icon-{size}.png?v={version}"


def _default_icon(size: int) -> bytes:
    """Blue rounded icon with a white lightning bolt (used until a logo is uploaded)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(47, 124, 246, 255))
    s = size
    bolt = [(0.56*s, 0.14*s), (0.30*s, 0.56*s), (0.47*s, 0.56*s),
            (0.44*s, 0.86*s), (0.70*s, 0.42*s), (0.52*s, 0.42*s)]
    d.polygon(bolt, fill=(255, 255, 255, 255))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


@router.get("/app-config")
async def get_app_config():
    cfg = await _get_config()
    version = cfg.get("version", 0)
    has_logo = bool(cfg.get("logo_512"))
    return {
        "app_name": cfg.get("app_name") or "Simran Inventory",
        "has_logo": has_logo,
        "version": version,
        "logo_url": _logo_url(512, version) if has_logo else None,
        "icon_192": _logo_url(192, version) if has_logo else None,
        "icon_512": _logo_url(512, version) if has_logo else None,
    }


def _make_square(data: bytes, size: int) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    img.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()


@router.put("/app-config")
async def update_app_config(logo: UploadFile = File(None), app_name: str = Form(None),
                            user: dict = Depends(require_roles(ROLE_MAIN))):
    cfg = await _get_config()
    version = cfg.get("version", 0) + 1
    update = {"version": version, "updated_at": datetime.now(timezone.utc).isoformat()}
    if app_name is not None and app_name.strip():
        update["app_name"] = app_name.strip()
    if logo is not None:
        raw = await logo.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        try:
            update["logo_512"] = _make_square(raw, 512)
            update["logo_192"] = _make_square(raw, 192)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
    await db.settings.update_one({"_id": CONFIG_ID}, {"$set": update}, upsert=True)
    return await get_app_config()


@router.get("/app-config/icon-{size}.png")
async def get_icon(size: int):
    cfg = await _get_config()
    data = cfg.get("logo_512" if size >= 512 else "logo_192")
    if not data:
        data = _default_icon(512 if size >= 512 else 192)
    return Response(content=bytes(data), media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})


@router.get("/manifest.webmanifest")
async def manifest():
    cfg = await _get_config()
    version = cfg.get("version", 0)
    name = cfg.get("app_name") or "Simran Inventory"
    icons = [
        {"src": _logo_url(192, version), "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": _logo_url(512, version), "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": _logo_url(512, version), "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ]
    data = {
        "name": name, "short_name": name[:12], "start_url": "/", "scope": "/",
        "display": "standalone", "orientation": "portrait",
        "background_color": "#ffffff", "theme_color": "#2F7CF6", "icons": icons,
    }
    return JSONResponse(content=data, headers={"Cache-Control": "no-cache"})
