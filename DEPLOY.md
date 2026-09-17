# Deploy OB Scanner (free)

Needs `server.py` (not static-only). Scan only — no broker.

## Render free

1. Push this folder to a GitHub repo (or use Blueprint from `render.yaml`).
2. New **Web Service** → connect repo → runtime **Python**.
3. Build Command: `true` (or leave blank)
4. Start Command: `python3 -u server.py`
   - `server.py` reads **`PORT`** from the environment (Render injects it) and binds **`0.0.0.0`**.
5. Plan: **Free**
6. After deploy: open `https://<service>.onrender.com/`

Cold start ~30–60s on free tier after idle.

Optional Blueprint: from the Render dashboard, New → Blueprint → select this repo (`render.yaml`).

## Local check

```bash
python3 server.py                 # 127.0.0.1:8765
python3 server.py 9000            # 127.0.0.1:9000
PORT=8765 HOST=0.0.0.0 python3 server.py
curl -s http://127.0.0.1:8765/api/health
```

## PythonAnywhere free

Free tier serves via **WSGI**, not `python server.py`.

1. Create a free Web app (Manual config / Flask / Bottle — any).
2. Clone this repo to e.g. `/home/<user>/ob-scanner`.
3. Point the WSGI file at `/home/<user>/ob-scanner/wsgi.py`
   (or paste its `application` into the generated `/var/www/<user>_pythonanywhere_com_wsgi.py`
   and set `project_home` / `sys.path` to the clone).
4. Reload the web app → `https://<user>.pythonanywhere.com/`
5. Smoke: `/api/health` and `/api/candles?symbol=BTCUSD&tf=M15`

`wsgi.py` reuses `server.fetch_candles` (stdlib only). Outbound HTTPS to Coinbase/Yahoo must be allowed (free accounts: specific allowlist — Coinbase API and Yahoo finance hosts may need checking).

## After code update (PythonAnywhere)

1. `git pull` in the project folder (e.g. `/home/<user>/ob-scanner`).
2. Open the **Web** tab → **Reload** the web app so WSGI and static files (`server.py`, `app.js`, `index.html`) pick up the changes.
3. Hard-refresh the browser (cache-bust) and smoke `/api/health` — `symbols` should list the expanded watchlist.
