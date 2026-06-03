# Gym & Nutrition Tracker

Functional first-pass web app for gym and nutrition tracking. It supports free signup with one all-purpose account type, food logging, manual calorie entries, custom foods, workout sessions, editable workout sets, and exercise recommendations by muscle group.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy
- Local database: SQLite by default for quick development
- Optional database: PostgreSQL via `docker-compose.yml`
- Optional food API: Open Food Facts
- Optional LLM helper: any OpenAI-compatible chat completions provider

## Run Locally

Backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the app at `http://localhost:5173`. The API docs are at `http://localhost:8000/docs`.

## Optional PostgreSQL

Start Postgres:

```bash
docker compose up -d postgres
```

Create `backend/.env`:

```bash
DATABASE_URL=postgresql+psycopg://gym:gym@localhost:5432/gym
APP_SECRET=change-this
FRONTEND_ORIGIN=http://localhost:5173
OPENFOODFACTS_ENABLED=true
```

Then restart the backend.

## Optional LLM Setup

The app has a disabled-by-default `/ai/assist` endpoint. Use any OpenAI-compatible provider by setting:

```bash
LLM_API_BASE=https://provider.example/v1
LLM_API_KEY=your-key
LLM_MODEL=provider-free-model-name
```

Good future uses: natural-language meal parsing, workout suggestions, and food estimate helpers. Core tracking does not depend on LLMs.

## Verification

Commands already run successfully:

```bash
cd backend && .venv/bin/python -m compileall app
cd frontend && npm run build
```
