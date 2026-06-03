# Gym & Nutrition Web App — Build Plan

A **responsive web app** (works on desktop and mobile browsers) where **personal trainers and clients coordinate**. Clients log food and can log workouts solo; trainers track linked clients and assign recommended exercises by muscle group. Self-contained (no Apple Health).

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React + TypeScript + Vite** | Component model fits the role-based UI; TS catches mistakes early; Vite is fast |
| Styling | **Tailwind CSS** (responsive) | One codebase that adapts from phone to desktop via breakpoints |
| Backend | **FastAPI** (Python) | Async, automatic OpenAPI docs, Pydantic validation, clean for a typed API; faster to build a real API than Flask |
| Database | **PostgreSQL** + **SQLAlchemy** (ORM) + **Alembic** (migrations) | Relational data (trainer↔client links, logs) maps naturally to SQL |
| Auth | **JWT** (access + refresh) via `python-jose`, passwords hashed with `passlib`/bcrypt | Standard stateless auth for a SPA + API |
| Food data | **Open Food Facts** (primary, barcodes) + **USDA FoodData Central** (whole-food fallback) | Free, large, queried on demand and cached into our DB |
| Exercise data | **Free Exercise DB** (~870 exercises, tagged muscles + equipment) | Open JSON, seeded once, powers the recommendation engine |
| Calorie burn | **MET baseline** + optional strength work-estimate | Standard method; works for any exercise type |

> **Flask vs FastAPI:** Either works. FastAPI is recommended for the built-in validation (Pydantic) and auto-generated API docs, which speed up solo development. Use Flask only if you already know it well.
>
> **Responsive, not a separate mobile app:** A single React build serves PC and mobile. Add a web manifest + service worker later (PWA) so it installs to a phone home screen and works offline — no App Store needed.

---

## 2. Architecture

```
[ React SPA ]  ──HTTPS/JSON──>  [ FastAPI ]  ──>  [ PostgreSQL ]
   (browser)                       │
                                   └──> Open Food Facts / USDA  (external, cached)
```

- The React SPA calls the FastAPI JSON API. No server-rendered HTML.
- FastAPI owns all business logic and **all permission checks** (a browser client can never be trusted).
- External food APIs are called server-side; results users pick are cached into the `foods` table.

---

## 3. User Roles & Sharing Model

Three relationships:

- **Client** — owns and logs their own food; can log workouts solo.
- **Trainer** — links to clients via invite/accept; gets **read** access to a linked client's logs and **write** access to create/assign recommended workouts.
- **Both** — a user can hold both roles.

Trainers connect to clients through an **invite → accept** flow. Every API endpoint enforces the boundary server-side (e.g. a trainer can read a client's logs only if an `active` link row exists). This is the single most important thing to get right — it is where data leaks if rushed.

---

## 4. Data Model (PostgreSQL Tables)

### `users`
```
id (PK), display_name, email (unique), password_hash,
is_client (bool), is_trainer (bool),
sex, age, height_cm, weight_kg,
bmr, tdee, goal_type (lose|maintain|gain), daily_calorie_target,
created_at
```

### `trainer_client_links`
```
id (PK), trainer_id (FK→users), client_id (FK→users),
status (pending|active|revoked), created_at
UNIQUE(trainer_id, client_id)
```

### `foods` (cached from external APIs)
```
id (PK), name, brand, barcode, source (openfoodfacts|usda),
serving_sizes (JSONB: [{label, grams}]),
calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
```

### `food_log_entries`
```
id (PK), client_id (FK→users), date, food_id (FK→foods),
quantity_grams, computed_calories, computed_macros (JSONB),
meal_type (breakfast|lunch|dinner|snack)
```

### `exercises` (seeded library)
```
id (PK), name, equipment, category, met (numeric), instructions (text)
```

### `exercise_muscles` (join: exercise ↔ muscle group)
```
exercise_id (FK→exercises), muscle_group_id (FK→muscle_groups),
role (primary|secondary)
PRIMARY KEY(exercise_id, muscle_group_id)
```

### `muscle_groups` (reference)
```
id (PK), name   // chest, back, quads, hamstrings, biceps, etc.
```

### `workouts`
```
id (PK), client_id (FK→users), created_by_id (FK→users),
assigned_by_trainer (bool), date, status (planned|in_progress|completed)
```

### `workout_sets`
```
id (PK), workout_id (FK→workouts), exercise_id (FK→exercises),
reps, bar_weight_kg, added_weight_kg, duration_sec, computed_burn_kcal
```

> The many-to-many `exercise_muscles` join table is what makes the muscle-group recommendation query clean and fast.

---

## 5. API Endpoints (FastAPI sketch)

```
POST   /auth/register            create account, pick role(s)
POST   /auth/login               → access + refresh JWT
POST   /auth/refresh

GET    /me                       profile + computed BMR/TDEE/target
PATCH  /me                       update metrics/goal

GET    /foods/search?q=          search OFF/USDA (cached)
POST   /food-log                 log an entry
GET    /food-log?date=           day's entries + totals

GET    /exercises?muscles=a,b    recommendation query (multi-select)
GET    /muscle-groups

POST   /workouts                 start/create a session
POST   /workouts/{id}/sets       add a set (returns computed burn)
GET    /workouts?date=

POST   /links/invite             trainer invites client
POST   /links/{id}/accept        client accepts
GET    /trainer/clients          trainer's linked clients
GET    /trainer/clients/{id}/logs   read client logs (link-gated)
POST   /trainer/clients/{id}/workouts   assign a recommended workout
```

Every `/trainer/...` route checks for an `active` link before returning data.

---

## 6. Calorie Logic

### Daily target (BMR → TDEE)
**Mifflin-St Jeor** (uses height, weight, age, sex) × activity factor → TDEE → adjusted by goal.

```
Male:   BMR = 10·kg + 6.25·cm − 5·age + 5
Female: BMR = 10·kg + 6.25·cm − 5·age − 161
TDEE   = BMR × activityFactor (1.2 – 1.9)
Target = TDEE ± goal adjustment
```

### Food calories in
`entryCalories = (calories_per_100g / 100) × quantity_grams`
Daily total = sum of the day's `food_log_entries`. Computed server-side on insert.

### Workout calories out (MET baseline)
```
burnKcal = MET × weightKg × durationHours
```

### Strength refinement (Phase 3, optional)
```
work ≈ totalWeight × reps × rangeOfMotion   →  scaled to kcal
```
> ⚠️ Be upfront in the UI: strength-training burn is an **estimate**. Even commercial apps only approximate it.

---

## 7. Recommendation Engine

**Input:** a multi-select set of muscle groups (passed as `?muscles=chest,triceps`).

**Query:** join `exercises` ↔ `exercise_muscles` ↔ `muscle_groups`, default to **ANY** — return exercises training *at least one* selected group, and surface which selected groups each covers. (Strict **ALL** returns empty far too often.)

**Output:** a ranked list, or an **empty state** when nothing matches.

> **On "impossible" combinations:** A combination like *feet + chest* isn't forbidden — there's simply no exercise training both, so the honest result is an **empty list**. That empty state *is* your impossible-combination handling, correct by construction. No hard-blocking in the MVP. Opinionated blocking rules (e.g. a PT not wanting two large groups in one session) can be layered in Phase 3.

Optional filters: equipment, difficulty.

---

## 8. Page / View Map (responsive)

- **Auth** — register/login, pick role(s).
- **Onboarding** — enter profile (height/weight/age/sex/goal).
- **Today (client)** — calorie balance (in vs out), meal log, quick-add food.
- **Food search** — query OFF/USDA, pick serving, log entry.
- **Workout** — start/log session, add sets (reps, bar weight), see burn.
- **Exercise browser** — multi-select muscle groups → recommendation list / empty state.
- **Trainer dashboard** — list of linked clients + recent activity.
- **Client detail (trainer)** — view logs, build & assign a recommended workout.
- **Profile/Settings** — edit metrics, manage trainer/client links.

> Each view uses Tailwind breakpoints: single-column stacked on mobile, multi-column on desktop. Navigation collapses to a bottom bar / hamburger on small screens.

---

## 9. Phasing

### Phase 1 — MVP
- Register/login (JWT) + role selection
- Profile with height/weight → BMR/TDEE/target
- Food search + daily log + calorie totals
- Solo workout logging (sets, bar weight) + MET burn
- Muscle-group exercise browser with empty-state handling

### Phase 2 — Coordination
- Trainer↔client invite/accept flow
- Trainer read-access to client logs (link-gated)
- Trainer-created & assigned recommended workouts

### Phase 3 — Depth
- Strength-specific burn refinement
- Barcode scanning (browser camera → Open Food Facts)
- Calorie-balance dashboard + history/trends (charts)
- PWA: installable + offline
- Optional opinionated combination-blocking rules

---

## 10. Key Risks & Decisions

- **Permission checks** — enforced server-side on every endpoint; never trust the browser. Test the trainer/client boundary before any real data.
- **API caching** — cache only foods users actually pick into `foods` for speed and to respect external rate limits.
- **Match strategy** — confirm ANY vs ALL early; it shapes the whole browser UX.
- **Burn accuracy** — set expectations in-UI; never present strength burn as precise.
- **CORS & secrets** — lock CORS to your frontend origin; keep JWT secret and USDA key in env vars, never in the React bundle.
- **Token storage** — prefer httpOnly cookies for refresh tokens over localStorage to reduce XSS risk.

---

## 11. Suggested Build Order

1. FastAPI project + PostgreSQL + SQLAlchemy + Alembic; first migration (`users`)
2. Auth: register/login/refresh with JWT + password hashing
3. Seed `exercises`, `muscle_groups`, `exercise_muscles` from Free Exercise DB
4. React + Vite + Tailwind scaffold; auth flow + protected routes
5. Profile + BMR/TDEE math (server-side)
6. Food search → log → daily total
7. Workout logging + MET burn
8. Exercise browser + recommendation query
9. Trainer linking + dashboards, link-gated endpoints (Phase 2)
10. Dashboard charts, barcode, PWA, refinements (Phase 3)

---

## 12. Suggested Repo Layout

```
workout-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + router includes
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic request/response
│   │   ├── routers/           # auth, food, workouts, exercises, trainer
│   │   ├── services/          # calorie logic, external API clients
│   │   ├── core/              # config, security (JWT), deps
│   │   └── db.py
│   ├── alembic/               # migrations
│   ├── seed/                  # exercise DB seeding script
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/             # Today, FoodSearch, Workout, Browser, Trainer…
    │   ├── components/
    │   ├── api/               # typed fetch wrappers
    │   ├── hooks/
    │   └── App.tsx
    ├── tailwind.config.js
    └── package.json
```
