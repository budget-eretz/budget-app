# AGENT Guide

## Purpose
- Snapshot for any agent/human working on this repo so you can ramp up quickly and keep changes aligned.

## Project At A Glance
- Monorepo with npm workspaces: `backend` (Express + TypeScript + PostgreSQL) and `frontend` (React 18 + Vite).
- Default ports: backend API `4567` (API base `/api`), frontend `3456`, Postgres exposed on `5433` via Docker.
- Backend entry `src/start.ts` runs migrations and seeds if the `users` table is empty, then loads `src/server.ts`.
- Frontend dev proxy routes `/api` to the backend; `VITE_API_URL` can override and defaults to `http://localhost:4567/api` in dev.

## Setup And Running
- Docker (recommended): `docker-compose up -d` then open `http://localhost:3456`. Compose wires Postgres 15 + backend `npm run dev` + frontend `npm run dev` with `VITE_API_URL=http://localhost:4567/api`.
- Local without Docker:
  1) `npm install`
  2) Create `backend/.env`:
     ```
     NODE_ENV=development
     PORT=4567
     PGHOST=localhost
     PGPORT=5433
     PGDATABASE=budget_app
     PGUSER=budget_app_user
     PGPASSWORD=your_password
     JWT_SECRET=your-very-secret-key-change-this
     JWT_EXPIRES_IN=30d
     ```
  3) `cd backend && npm run migrate && npm run seed`
  4) Run `npm run dev --workspace=backend` and `npm run dev --workspace=frontend` in separate terminals.
- Useful scripts:
  - Root: `npm run dev` (backend), `npm run dev:frontend`, `npm run build` (all workspaces), `npm run start --workspace=backend` (compiled start).
  - Backend: `npm run migrate`, `npm run seed`, `npm run db:setup`, `npm run check:income-budget`, `npm run verify:reporting-views`.
  - Helpers: `scripts/init-dev.(sh|bat)` waits for DB, then runs migrate + seed for local/Docker dev.

## Data Model Quick Map
- `groups`, `users` (circle treasurer, group treasurer, members) with `user_groups` link table.
- `budgets` (circle/global or group scoped) with `funds`.
- Spending: `planned_expenses`, `direct_expenses`, `reimbursements` (approval + payment), `payment_transfers`, `budget_transfers`.
- Income: `incomes`, `income_categories`, `expected_incomes`, `charges`, `recurring_transfers`.
- Reporting surfaces: `/api/reports` and `/api/dashboard`.

## Seed Accounts (after `npm run seed`)
- Circle treasurer: `treasurer@circle.com` / `password123`
- Group treasurers: `treasurer@north.com` / `password123`, `treasurer@center.com` / `password123`
- Members: `member1@circle.com`, `member2@circle.com`, `member3@circle.com` (password `password123`, assigned to North/Center groups)

## Key References
- `README.md` for full setup (Docker + manual), environment, and seed table.
- Feature/behavior docs: `BUDGET_ACTIVE_STATUS_FEATURE.md`, `EXPECTED_INCOME_MEMBER_ACCESS.md`, `INCOME_BUDGET_FIX_HE.md`, `RECURRING_TRANSFERS_FEATURE.md`, `RECURRING_TRANSFERS_INTEGRATION.md`, `DEPLOYMENT_CHECKLIST.md`, `render.yaml`.
- Frontend API base helpers: `frontend/src/services/api.ts`, `frontend/src/utils/networkUtils.ts`.
- Backend entrypoints: `backend/src/start.ts`, `backend/src/server.ts`, routes under `backend/src/routes/`.

## Conventions
- Keep backend changes in TypeScript under `src/`; rebuild with `npm run build` when shipping compiled start.
- API changes should align with frontend expectations (`/api` base, JSON responses) and consider seed data.
- Add new environment variables to both `.env` guidance and compose files to prevent drift.
- Prefer Docker for parity; if touching migrations, run `npm run migrate` and validate seeds locally.
