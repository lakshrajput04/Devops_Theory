# 🐍 Flask Snake: Docker + GitHub Actions + Render

A Snake browser game, written in JavaScript and served by Python Flask. It is packaged as a Docker container, built and tested automatically with GitHub Actions, and deployed continuously to Render.

**Case study (SCP):** Ishita Jog (16010123153), Jaydeep Malani (16010123159), Laksh Rajput (16010123181)

## Architecture

```
 Developer ──git push──▶ GitHub repo
                             │
                             ▼
                    GitHub Actions (ci-cd.yml)
                    ┌─────────────────────────────┐
                    │ 1. test   → pytest           │
                    │ 2. docker → build image,     │
                    │             run, curl /health│
                    │ 3. deploy → POST Render      │
                    │             Deploy Hook      │
                    └──────────────┬──────────────┘
                                   ▼
                    Render: pulls repo, builds Dockerfile,
                    health-checks /health, swaps to new version
                                   │
                                   ▼
                    https://<your-service>.onrender.com  ◀── players
```

Render's auto-deploy is **off**. Render deploys only after CI passes, so broken code never goes live.

## Project structure

| Path | Purpose |
|---|---|
| `app.py` | Flask app: game page, `/health`, `/api/version`, `/api/scores` (leaderboard) |
| `templates/index.html`, `static/` | Game UI. `static/js/game.js` holds the Snake logic and the `CONFIG` block |
| `tests/test_app.py` | pytest tests for the Flask routes |
| `Dockerfile` | `python:3.12-slim`, non-root user, gunicorn on `$PORT` (default 10000) |
| `.github/workflows/ci-cd.yml` | test → docker build/smoke test → deploy to Render |
| `render.yaml` | Render Blueprint (Docker web service, free plan, health check) |

## Run locally

**With Python**
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements-dev.txt
pytest -v
python app.py                   # http://localhost:10000
```

**With Docker**
```bash
docker build -t flask-snake .
docker run --rm -p 10000:10000 flask-snake   # http://localhost:10000
```

## One-time setup

### 1. Push to GitHub
Create an empty repo on github.com (e.g. `flask-snake-devops`). Don't add a README. Then run:
```bash
git init -b main
git add .
git commit -m "Flask Snake game with Docker, GitHub Actions and Render"
git remote add origin https://github.com/<your-username>/flask-snake-devops.git
git push -u origin main
```
The **CI/CD** workflow starts right away. `test` and `docker` should pass. `deploy` fails until step 3 is done, which is expected.

### 2. Create the Render service
1. Go to https://dashboard.render.com, then **New → Web Service**, and connect your GitHub repo.
2. Language/Runtime: **Docker**. Instance type: **Free**.
3. Under Advanced: set **Health Check Path** to `/health` and **Auto-Deploy** to **No**.
4. Click **Create Web Service**. Render builds once and gives you `https://<name>.onrender.com`.
5. Go to **Settings → Deploy Hook** and copy the URL. Keep it private: anyone with it can trigger deploys.

> Alternative: **New → Blueprint** and select the repo. `render.yaml` sets the same options.

### 3. Connect GitHub Actions to Render
In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**:
- Name: `RENDER_DEPLOY_HOOK_URL`
- Value: the Deploy Hook URL from Render

Then go to **Actions → CI/CD → Run workflow**. All three jobs should turn green, and Render should show a new deploy.

## Live demo script

1. **Show the code:** the repo, `Dockerfile`, and `.github/workflows/ci-cd.yml`.
2. **Show the container locally:** `docker build -t flask-snake .` and `docker run -p 10000:10000 flask-snake`, then open localhost:10000.
3. **Open the live app** at `https://<name>.onrender.com`. Play a round and submit a score. The badge shows **v1.0.0**.
4. **Update the game.** Make a visible change, for example:
   - `app.py`: `APP_VERSION = os.environ.get("APP_VERSION", "1.1.0")`
   - `static/js/game.js` → `CONFIG`: `snakeColor: "#3b82f6"`, `headColor: "#93c5fd"` (blue snake), or `startSpeedMs: 100` (faster)
5. **Push it:**
   ```bash
   git commit -am "v1.1.0: blue snake, faster start"
   git push
   ```
6. **Watch the pipeline:** on GitHub Actions, `test` → `docker` → `deploy` each go green. On Render, the **Events** tab shows "Deploy started" and then "Deploy live".
7. **Refresh the live URL.** The badge reads **v1.1.0** and the snake is blue.
8. (Optional) **Show the safety net:** break a test, push, and show that the pipeline stops at `test` and Render is never asked to deploy.

## Notes
- Render's free tier sleeps after about 15 min idle. The first request then takes 30–60 s, so open the URL a minute before presenting.
- The leaderboard is kept in memory, so it resets on every redeploy. gunicorn runs one worker (with threads) so all players share one leaderboard.
