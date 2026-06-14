# Deployment Guide 🚀

This guide explains how to deploy the **RailMind Automation** codebase to **Render** (for the backend) and **Vercel** (for the frontend).

---

## 1. Backend Deployment (Render) 🐍

The Python backend is built with FastAPI, Uvicorn, and Socket.IO. We have configured it to support dynamic CORS origins and created a Render Blueprint (`render.yaml`) to automate the setup.

### Option A: One-Click Blueprint Deployment (Recommended)
1. Push this codebase (including `render.yaml`) to your GitHub/GitLab repository.
2. Go to the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect the `render.yaml` file and parse the services:
   - **Service Name**: `railmind-backend`
   - **Root Directory**: `backend`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:sio_asgi_app --host 0.0.0.0 --port $PORT`
6. Under **Environment Variables**, provide your `ANTHROPIC_API_KEY` (if using live Claude agent orchestration).
7. Click **Apply** to deploy.

### Option B: Manual Web Service Deployment
If you prefer to configure it manually:
1. Click **New +** and select **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `railmind-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:sio_asgi_app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables**:
   - `SIMULATION_SPEED` = `1.0`
   - `INCIDENT_PROBABILITY` = `0.02`
   - `MAX_AGENT_ITERATIONS` = `5`
   - `ANTHROPIC_API_KEY` = `[Your Anthropic Key]`
   - `CORS_ALLOWED_ORIGINS` = `https://your-frontend-vercel-url.vercel.app` (or `*` to allow all)

Once deployed, copy your Render web service URL (e.g. `https://railmind-backend.onrender.com`).

---

## 2. Frontend Deployment (Vercel) ⚡

The frontend is a Vite + React + TanStack Start project. Vercel natively supports building and hosting Vite-based apps.

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** and select **Project**.
3. Import your Git repository.
4. Keep the **Root Directory** as the root of the repository.
5. Vercel will automatically detect **Vite** or **TanStack Start**.
6. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.onrender.com` (use your actual Render backend URL *without* a trailing slash)
7. Click **Deploy**.

---

## 3. How to Connect Them & CORS 🔒

- **CORS Configured**: The backend's FastAPI and Socket.IO servers are configured to read permitted origins from the `CORS_ALLOWED_ORIGINS` environment variable.
- For maximum security in production, set `CORS_ALLOWED_ORIGINS` on Render to your exact Vercel deployment URL (e.g. `https://railmind-automation.vercel.app`).
- If you're testing multiple preview branches or want to allow any frontend deployment, you can set `CORS_ALLOWED_ORIGINS` to `*`.
