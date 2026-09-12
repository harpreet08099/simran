import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from db import db

JWT_ALGORITHM = "HS256"
ROLE_MAIN = "main_admin"
ROLE_SUB = "sub_admin"
ROLE_MEMBER = "member"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != expected:
        raise HTTPException(status_code=401, detail="Invalid token type")
    return payload


def team_id_of(user: dict) -> str:
    return user["sub_admin_id"] if user["role"] == ROLE_MEMBER else user["id"]


def access_info(owner: dict) -> dict:
    now = datetime.now(timezone.utc)
    access_type = owner.get("access_type", "lifetime")
    end = owner.get("access_end")
    days_left = None
    active = bool(owner.get("is_active", True))
    if access_type == "limited" and end:
        end_dt = datetime.fromisoformat(end)
        remaining = end_dt - now
        days_left = max(0, (remaining.total_seconds() + 86399) // 86400) if remaining.total_seconds() > 0 else 0
        days_left = int(days_left)
        if remaining.total_seconds() <= 0:
            active = False
    return {"access_type": access_type, "access_end": end, "days_left": days_left, "active": active}


async def check_access(user: dict) -> dict:
    """Returns access info for the user's team owner; raises 403 if blocked."""
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Your access has been revoked. Contact your admin.")
    if user["role"] == ROLE_MAIN:
        return {"access_type": "lifetime", "access_end": None, "days_left": None, "active": True}
    owner = user if user["role"] == ROLE_SUB else await db.users.find_one({"id": user["sub_admin_id"]}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=403, detail="Your admin account no longer exists.")
    info = access_info(owner)
    if not owner.get("is_active", True):
        raise HTTPException(status_code=403, detail="Access has been revoked by the main admin.")
    if not info["active"]:
        raise HTTPException(status_code=403, detail="Subscription has expired. Contact the main admin.")
    return info


def public_user(user: dict) -> dict:
    u = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return u


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token, "access")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user["access"] = await check_access(user)
    user["team_id"] = team_id_of(user)
    return public_user(user)


def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not permitted")
        return user
    return dep


async def resolve_team_id(user: dict, team_id: str | None) -> str:
    """Main admin may act on any team by passing team_id."""
    if team_id and user["role"] == ROLE_MAIN:
        return team_id
    return user["team_id"]
