# Gym & Nutrition Tracker

A functional web app for tracking daily food calories, workout sessions, exercise sets, and estimated calorie balance.

The current product uses one all-purpose account type. Every user can log meals, create workout sessions, edit sets, browse exercises, and manage their own profile.

## Features

- Free signup and login
- Profile with body metrics and daily calorie target
- Daily food log
- Manual meal calorie entry
- Custom saved foods
- Open Food Facts search support
- Daily calorie summary
- Workout sessions
- Rename and remove workout sessions
- Add, edit, and remove workout sets
- Estimated workout calories burned
- Exercise browser by muscle group
- Optional AI helper endpoint for future meal/workout assistance

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Lucide React icons

### Backend

- FastAPI
- Python
- SQLAlchemy ORM
- Pydantic
- Uvicorn

### Database

- SQLite for local development by default
- PostgreSQL for production deployment
- Neon PostgreSQL recommended for hosting

### Deployment

- Netlify for frontend
- Render for backend
- Neon for database

## System Design

```text
Browser
  |
  | React/Vite frontend
  v
FastAPI backend
  |
  | SQLAlchemy
  v
SQLite locally / PostgreSQL in production
```

The frontend only displays UI and sends requests. The backend owns authentication, database access, validation, permission checks, and calorie calculations.

## Data Storage

The app stores account and tracking data in SQL tables.

Important tables:

- `users`: account email, password hash, profile, body metrics, calorie target
- `foods`: custom and cached food records
- `food_log_entries`: logged meals for each date
- `muscle_groups`: seeded muscle groups
- `exercises`: seeded exercise library
- `exercise_muscles`: exercise-to-muscle-group mapping
- `workouts`: workout sessions
- `workout_sets`: sets inside workout sessions

There are some older trainer/client link models still present internally from an earlier plan, but the current app does not use roles or links in the UI.

## Account And Auth Logic

Users register with:

- display name
- email
- password

Passwords are not stored directly. The backend stores a salted PBKDF2 password hash.

Login flow:

```text
email + password
  -> backend verifies password hash
  -> backend returns signed access token
  -> frontend stores token in localStorage
  -> frontend sends Authorization: Bearer <token>
```

This is intentionally simple MVP auth. For a production app, improve this with httpOnly cookies, refresh tokens, email verification, password reset, and stronger session handling.

## Calorie Logic

The app shows four calorie numbers in both the Food and Workout sections:

- Daily target
- Calories in
- Calories out
- Remaining

### Calories In

Calories in comes from logged meals.

For manual food entry, the app uses the exact calories entered by the user:

```text
meal calories = manually entered calories
```

Daily calories in:

```text
calories in = sum of all logged meal calories for the selected date
```

Example:

```text
Breakfast: 450 kcal
Lunch: 700 kcal
Dinner: 800 kcal

Calories in = 450 + 700 + 800 = 1950 kcal
```

### Calories Out

Calories out comes from workout sets.

Each exercise has a MET value. When a set is added or edited, the backend estimates calories burned with:

```text
calories out = MET x body weight kg x duration hours
```

Example:

```text
Exercise MET: 5
User weight: 70 kg
Duration: 180 seconds = 0.05 hours

Calories out = 5 x 70 x 0.05 = 17.5 kcal
```

If the user's profile has no weight, the app uses a fallback weight:

```text
75 kg
```

Current limitation:

- Reps and weight lifted are stored.
- Reps and weight lifted do not currently affect calorie burn.
- Only MET, body weight, and duration affect calorie burn.

### Daily Target

The daily target comes from the Profile page.

If the user sets `Daily calorie target, kcal`, the app uses that value.

If the user does not set a manual daily target, the backend estimates a target from BMR and TDEE.

BMR uses Mifflin-St Jeor:

```text
Male:
BMR = 10 x weight_kg + 6.25 x height_cm - 5 x age + 5

Female:
BMR = 10 x weight_kg + 6.25 x height_cm - 5 x age - 161

Other:
BMR = 10 x weight_kg + 6.25 x height_cm - 5 x age - 78
```

TDEE:

```text
TDEE = BMR x activity_factor
```

Default activity factor:

```text
1.375
```

Goal adjustment:

```text
lose:     TDEE - 400
maintain: TDEE
gain:     TDEE + 300
```

### Remaining Calories

Remaining calories:

```text
remaining = daily target - calories in + calories out
```

Example:

```text
Daily target: 2200 kcal
Calories in: 1600 kcal
Calories out: 250 kcal

Remaining = 2200 - 1600 + 250 = 850 kcal
```

Workout calories are added back because workouts increase estimated energy burned.

## How To Use The App

### 1. Create An Account

Open the frontend and register with:

- display name
- email
- password

### 2. Set Up Profile

Go to `Profile` and fill in:

- display name
- sex
- age
- height in cm
- weight in kg
- goal
- daily calorie target in kcal

The daily target controls the calorie balance cards.

### 3. Log Food

Go to `Today`.

Use `Log food manually` when you know the total calories.

Example:

```text
Meal: lunch
What did you eat: chicken rice bowl
Total calories: 650
```

Click `Add entry`.

The meal appears under `Logged meals`. Use `Remove` to delete it.

### 4. Save Custom Food

Use `Save custom food` when you want a reusable food entry.

Calories are stored per 100g.

Example:

```text
Food name: homemade chicken curry
Usual serving g: 250
Calories / 100g: 180
```

### 5. Search Foods

Use `Food search` to search Open Food Facts. Click a result to log it.

### 6. Create Workout Sessions

Go to `Workout`.

Click `Start workout` to create a session.

You can:

- select a session
- rename a session
- remove a session
- add sets to the selected session

### 7. Add Workout Sets

Fill in:

- Exercise
- Reps
- Weight used, kg
- Duration, seconds

Click `Add set`.

Duration is used for calorie burn estimation.

### 8. Edit Or Remove Sets

Under `Sets in selected session`, you can:

- change exercise
- change reps
- change weight
- change duration
- save the set
- remove the set

Changing duration recalculates calories burned.

### 9. Browse Exercises

Go to `Exercises`.

Select muscle groups to filter the exercise list.

The matching strategy is `ANY`, meaning the app returns exercises that match at least one selected muscle group.

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:5173
```

## Environment Variables

Local backend env file:

```text
backend/.env
```

Example:

```env
DATABASE_URL=sqlite:///./gym.db
APP_SECRET=change-me-in-development
FRONTEND_ORIGIN=http://127.0.0.1:5173
OPENFOODFACTS_ENABLED=true
LLM_API_BASE=
LLM_API_KEY=
LLM_MODEL=
```

Frontend deployment env variable:

```env
VITE_API_URL=https://your-render-backend.onrender.com
```

Backend deployment env variables:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
APP_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=https://your-netlify-site.netlify.app
OPENFOODFACTS_ENABLED=true
PYTHON_VERSION=3.12.4
```

## Optional PostgreSQL Locally

Start local Postgres:

```bash
docker compose up -d postgres
```

Use this in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://gym:gym@localhost:5432/gym
APP_SECRET=change-this
FRONTEND_ORIGIN=http://127.0.0.1:5173
OPENFOODFACTS_ENABLED=true
```

Then restart the backend.

## Deployment

Recommended:

- Netlify for frontend
- Render for backend
- Neon PostgreSQL for database

See:

[DEPLOYMENT.md](./DEPLOYMENT.md)

Important deployment notes:

- Set `VITE_API_URL` in Netlify to the Render backend URL.
- Set `FRONTEND_ORIGIN` in Render to the Netlify frontend URL.
- Set `DATABASE_URL` in Render to the Neon PostgreSQL URL.
- Use `PYTHON_VERSION=3.12.4` on Render.
- If Render uses a plain `postgresql://` Neon URL, the backend normalizes it to `postgresql+psycopg://`.

## Verification

Backend compile:

```bash
cd backend
.venv/bin/python -m compileall app
```

Frontend build:

```bash
cd frontend
npm run build
```

## Current Limitations

- Auth is MVP-level and stores the token in localStorage.
- No password reset yet.
- No email verification yet.
- No Alembic migrations yet.
- Workout burn is an estimate.
- Reps and lifted weight do not affect calorie burn yet.
- Local SQLite data does not automatically migrate to deployed PostgreSQL.

## Future Improvements

- Better production auth with refresh tokens and httpOnly cookies
- Password reset
- Email verification
- Alembic migrations
- Food serving-size picker
- Barcode scanning
- Workout templates
- History charts
- AI meal parsing
- AI workout suggestions
