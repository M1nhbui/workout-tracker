# Deployment Guide

Recommended low-cost setup:

- Frontend: Netlify
- Backend: Render
- Database: Neon PostgreSQL

## 1. Push To GitHub

Commit and push this repository to GitHub. Netlify and Render will both deploy from the GitHub repo.

## 2. Create Neon Database

1. Go to https://neon.com.
2. Create a free project.
3. Copy the pooled PostgreSQL connection string.
4. Convert it to SQLAlchemy's psycopg format if needed:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Keep this value for Render's `DATABASE_URL`.

## 3. Deploy Backend On Render

1. Go to https://render.com.
2. Create a new Web Service from this GitHub repo.
3. Use these settings:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

4. Add environment variables:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
APP_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=https://temporary-placeholder.netlify.app
OPENFOODFACTS_ENABLED=true
PYTHON_VERSION=3.12.4
```

5. Deploy and copy the Render backend URL.

## 4. Deploy Frontend On Netlify

1. Go to https://netlify.com.
2. Import this GitHub repo.
3. Netlify should read `netlify.toml` automatically:

```text
Base directory: frontend
Build command: npm run build
Publish directory: frontend/dist
```

4. Add environment variable:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

5. Deploy and copy the Netlify frontend URL.

## 5. Fix Backend CORS

Go back to Render and update:

```text
FRONTEND_ORIGIN=https://YOUR-NETLIFY-SITE.netlify.app
```

Redeploy the backend.

## 6. Test Production

Open the Netlify URL and test:

1. Register a new account.
2. Save profile.
3. Log a meal.
4. Start a workout.
5. Add and edit a set.

## Notes

- Local SQLite data does not automatically move to Neon.
- The first backend request may be slow if the backend host sleeps on a free tier.
- Use a long random `APP_SECRET` and never commit it to GitHub.
