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
