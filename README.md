# BrightPath Learning Platform

Phase 1 foundation for a private personalised homework and smart-practice platform. The repository is split into a Vite React client and an Express/Prisma API. React communicates only with the API; the API owns all database access.

## Structure

- `frontend/` — React + Vite app, API client, shared styles
- `backend/src/config/` — validated environment configuration
- `backend/src/routes/` — REST route modules
- `backend/src/services/` — database/service layer
- `backend/prisma/` — PostgreSQL schema and seed data

## Prerequisites

Node.js 20+ and a PostgreSQL database. A Supabase project is recommended for development.

## Supabase setup

1. Create/open a Supabase project.
2. Go to **Project Settings → Database → Connection string**.
3. Select **URI** and copy the connection string. Replace `[YOUR-PASSWORD]` with the database password (the URI commonly uses port 5432; use the Session/Transaction pooler URI if your deployment requires pooled connections).
4. Copy `backend/.env.example` to `backend/.env` and put that URI in `DATABASE_URL`. Never commit `.env`.

## Install and run

```bash
cd backend
npm install
copy .env.example .env   # Windows; use cp on macOS/Linux
npm run prisma:generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
copy .env.example .env   # Windows; use cp on macOS/Linux
npm run dev
```

Open `http://localhost:5173`. The Phase 1 screen reports API connectivity. API endpoints: `GET /api/health` and `GET /api/health/database`.

## Environment variables

Backend: `DATABASE_URL`, `PORT` (default 4000), `CLIENT_URL` (default http://localhost:5173), `JWT_SECRET` (minimum 32 characters), `NODE_ENV`.
Frontend: `VITE_API_URL` (default http://localhost:4000/api).

## Phase 2 authentication

The API now provides `POST /api/auth/login` and authenticated `GET /api/auth/me`. Send `Authorization: Bearer <token>` to protected endpoints. Parent/student profile examples are available at `/api/profile/parent` and `/api/profile/student`. The frontend includes the login screen and protected home route. Authentication currently uses short-lived JWT access tokens stored in browser local storage for this development phase; production hardening should move to secure, HttpOnly, SameSite cookies or a server-side session before deployment.

## Seed accounts

Development-only accounts are created with password `DemoPass123!`: `parent@example.test`, `sophie@example.test`, and `oliver@example.test`. These are placeholders and must not be used in production.

## Tests and production build

```bash
cd frontend && npm run build
cd backend && npm test
```

Implemented application routes include authentication, dashboards, catalog/subjects, progress, Smart Practice, Question Bank CRUD, JSON import validation, homework creation/listing/assignment answering/submission, parent child progress/results, mastery updates, review scheduling, and achievements. Frontend routes include student learning pages, subjects, parent overview, homework creator, question editor/import, child progress, and homework results. Homework answering autosaves each answer and updates mastery. Authentication now supports HttpOnly cookies, credentialed CORS, logout, and login rate limiting. Deployment templates are included in `render.yaml` and `frontend/vercel.json`. Practice-by-skill setup, session completion, and retry-incorrect foundations are implemented. Parent registration, child management, temporary-password change, and password-reset UI/API foundations are implemented. Password reset currently logs the one-time token server-side for development; production requires an email provider. Remaining work includes email verification, database-backed integration coverage, full accessibility review, and production monitoring.
