# Inventory Management App — PRD

## Original Problem Statement
Build a mobile-first inventory management app (React + FastAPI + MongoDB) with 3 roles:
1. **Main Admin** — hardcoded seed `harpreetsinghhappy7080@Gmail.com` / `@Harpreet7518`. Adds Sub Admins, controls their subscription duration (e.g. 10 days or lifetime), can revoke, can edit everything.
2. **Sub Admin** — owns a shop/team; adds Members by email + password. Loses access when revoked/expired.
3. **Member** — logs in; loses access automatically if their Sub Admin is revoked/expired.

UI must match the user's reference screenshots (Simran Mobile style): blue top bar on every screen (shop name on Home, "Items"/"Transactions"/"Settings" on tabs), swipeable blue summary card (Today → Yesterday), gray access bar shown ONLY when the main admin has given limited (day-based) access, bottom nav Home/Items/Transactions/Settings, Item Information, Transaction Details and Settings screens as provided.

## Architecture
- `backend/server.py` — app, CORS, startup indexes + main admin seed (ADMIN_EMAIL/ADMIN_PASSWORD/JWT_SECRET in backend/.env)
- `backend/auth.py` — bcrypt, PyJWT (15-min access + 7-day refresh), `get_current_user`, `check_access` (revocation/expiry cascade), `resolve_team_id` (main admin can act on any team via `?team_id=`)
- `backend/routers/auth_routes.py` — login (brute-force lockout), refresh, me, logout, profile, password
- `backend/routers/team_routes.py` — /admin/sub-admins CRUD, /team, /team/locations, /team/members CRUD
- `backend/routers/inventory_routes.py` — /items CRUD (soft-delete), /transactions (stock_in, stock_out, move, adjust), /dashboard
- Frontend: `src/context/AuthContext.jsx`, `src/lib/api.js` (axios + refresh interceptor + 403 auto-logout), `src/components/layout/*` (AppShell, TopBar, AccessBar, BottomNav, Menu), `src/pages/*`

## DB Schema (uuid string ids)
- `users`: id, email(lower), password_hash, name, role(main_admin|sub_admin|member), sub_admin_id, is_active, access_type(lifetime|limited), access_end(ISO), created_at
- `teams`: id (= owner user id), name, locations[]
- `items`: id, team_id, name, sku, barcode, category, brand, cost_price, selling_price, min_stock, unit, description, stock{location: qty}, quantity, is_archived
- `transactions`: id, team_id, type, location, to_location, memo, items[{item_id,name,category,brand,qty,before,after,delta}], total_qty, user_id, user_name, created_at
- `login_attempts`

## Implemented (2026-09-12)
- JWT auth, roles, main admin seed, brute-force lockout
- Sub admin management (create/edit/revoke/restore/delete, lifetime or N-day access) + member management (max 20/team); revocation & expiry cascade to members
- Items CRUD with auto SKU, barcode uniqueness, initial quantity (creates "Initial Quantity" adjust tx)
- Stock In / Out / Move / Adjust with per-location stock, validation, transaction history + details
- Dashboard (Today/Yesterday total, stock in, stock out, low stock count), Low Stock page
- Locations, Team Details (shop name), Profile & password, Subscription info page
- Full mobile UI matching reference screens; tested via testing agent (30/30 backend, all UI flows pass)

## Backlog
- P1: Barcode camera scanning (scan → find item / create with barcode)
- P1: Main admin view of a sub admin's inventory in the UI (backend already supports `?team_id=`)
- P2: Purchases / Sales / Returns, Inventory Count, Reports, CSV export, item photos (object storage)
- P2: Replace `window.confirm` with AlertDialog; MongoDB transactions for concurrent stock updates
- P3: Push notifications, offline mode, bundles
