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

## Implemented — Home redesign, PWA & new features (2026-06)
- Home screen fully redesigned to match reference screenshots: swipeable Today/Yesterday summary card at top, then card sections — Items (Add Item), Transactions (Stock In/Out/Move/Adjust), Low Stock Alerts, Inventory Count, Team Members, Past Quantity (View Stock by Date), Barcode Labels (Print Item Label), Purchases & Sales (Purchases/Sales/Returns/Bundles), and App (main admin only). All cards always visible & scrollable.
- Typography reduced app-wide (mobile-first); base font 15px; fixed horizontal (left) overflow on Items page via global overflow-x hidden.
- Top bar now always shows the shop name + app logo (never admin/member names) for all roles.
- New fully-functional features:
  - **View Stock by Date** (`GET /api/reports/stock-by-date`) — reconstructs each item's qty as of a chosen past date.
  - **Print Item Label** (`/labels`) — renders a CODE128 barcode (jsbarcode) with name/price/SKU and window.print().
  - **Bundles** (`/bundles`, `GET/POST/DELETE /api/bundles`) — group items with quantities; delete via AlertDialog.
  - **Inventory Count** (`/inventory-count`) — physical stock-take; applies a single "Inventory Count" adjust transaction for changed items.
  - **Returns** — new `return` transaction type (increases stock, like reverse stock-out).
- **App logo & Install (PWA)** — main admin page `/settings/app`:
  - Logo upload (`PUT /api/app-config`, main admin) resized to 192/512 PNG, stored in Mongo `settings` (object-storage service was returning 500s, so DB storage used for the single small logo).
  - `GET /api/app-config` (public), `GET /api/app-config/icon-{192,512}.png` (public; returns a generated blue lightning-bolt default when no logo set), `GET /api/manifest.webmanifest` (display: standalone, valid icons).
  - Installable PWA: manifest + service worker (`public/sw.js`) + "Create & Install shortcut" button using beforeinstallprompt; opens full-screen (no browser bar). iOS/Android fallback instructions shown.
- New DB: `settings` (single `app` doc: app_name, logo_192/512 bytes, version), `bundles` (id, team_id, name, items[], created_at).

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
- P2: Reports, CSV export, item photos (object storage — service currently 500ing)
- P2: MongoDB transactions for concurrent stock updates
- P3: Push notifications, offline mode
