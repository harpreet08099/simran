from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from db import db, client
from auth import hash_password, verify_password, ROLE_MAIN
from routers import auth_routes, team_routes, inventory_routes

app = FastAPI()
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Inventory API"}


api_router.include_router(auth_routes.router)
api_router.include_router(team_routes.router)
api_router.include_router(inventory_routes.router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def seed_main_admin():
    email = os.environ["ADMIN_EMAIL"].lower().strip()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    now = datetime.now(timezone.utc).isoformat()
    if existing is None:
        uid = str(uuid.uuid4())
        await db.users.insert_one({"id": uid, "email": email, "password_hash": hash_password(password),
                                   "name": "Harpreet Singh", "role": ROLE_MAIN, "sub_admin_id": None,
                                   "is_active": True, "access_type": "lifetime", "access_end": None, "created_at": now})
        await db.teams.insert_one({"id": uid, "name": "Simran Mobile", "locations": ["Default Location"], "created_at": now})
        logger.info("Seeded main admin")
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.items.create_index([("team_id", 1), ("name", 1)])
    await db.transactions.create_index([("team_id", 1), ("created_at", -1)])
    await seed_main_admin()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
