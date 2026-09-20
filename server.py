#!/usr/bin/env python3
"""
OB Scanner server — static files + candle proxy (Yahoo / Coinbase).
No API keys. Brief in-memory cache. Scan-only prototype (no trading).

Usage:
  python3 server.py          # http://127.0.0.1:8765
  python3 server.py 9000
  PORT=10000 python3 server.py   # bind 0.0.0.0:$PORT (Render / PaaS)
  HOST=0.0.0.0 PORT=8765 python3 server.py
"""
from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "cache"
CHECKS_DIR = ROOT / "data" / "checks"
PORT = 8765
CACHE_TTL = 60  # seconds
CACHE: dict[str, tuple[float, bytes, str]] = {}

# Personal sync codes for checked OBs (cloud). Alphabet omits 0/O/1/I.
SYNC_CODE_RE = re.compile(r"^OB-[A-Z2-9]{8,12}$")
SYNC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MAX_CHECKS_BODY = 200 * 1024  # bytes

UA = "Mozilla/5.0 (compatible; OBScanner/1.0; +local)"

# symbol -> (provider, remote_id, label note)
SYMBOLS = {
    "XAUUSD": ("coinbase", "PAXG-USD", "PAXGUSDT/PAXG-USD gold proxy (Coinbase)"),
    "NAS100": ("yahoo", "NQ=F", "CME Nasdaq-100 futures (Yahoo NQ=F)"),
    "SP500": ("yahoo", "ES=F", "CME E-mini S&P 500 futures (Yahoo ES=F)"),
    "BTCUSD": ("coinbase", "BTC-USD", "Coinbase BTC-USD"),
    "EURUSD": ("yahoo", "EURUSD=X", "Yahoo EURUSD=X"),
    "GBPUSD": ("yahoo", "GBPUSD=X", "Yahoo GBPUSD=X"),
    "XAUUSD_FUT": ("yahoo", "GC=F", "COMEX Gold futures (Yahoo GC=F)"),
    "USDJPY": ("yahoo", "USDJPY=X", "Yahoo USDJPY=X"),
    "AUDUSD": ("yahoo", "AUDUSD=X", "Yahoo AUDUSD=X"),
    "US30": ("yahoo", "YM=F", "CBOT Dow futures (Yahoo YM=F)"),
    "ETHUSD": ("coinbase", "ETH-USD", "Coinbase ETH-USD"),
    "NZDUSD": ("yahoo", "NZDUSD=X", "Yahoo NZDUSD=X"),
    "USDCAD": ("yahoo", "USDCAD=X", "Yahoo USDCAD=X"),
    "USDCHF": ("yahoo", "USDCHF=X", "Yahoo USDCHF=X"),
    "EURJPY": ("yahoo", "EURJPY=X", "Yahoo EURJPY=X"),
    "GBPJPY": ("yahoo", "GBPJPY=X", "Yahoo GBPJPY=X"),
    "SILVER": ("yahoo", "SI=F", "COMEX Silver futures (Yahoo SI=F)"),
    "OIL": ("yahoo", "CL=F", "WTI crude oil futures (Yahoo CL=F)"),
    "RUSSELL": ("yahoo", "RTY=F", "E-mini Russell 2000 futures (Yahoo RTY=F)"),
    "SOLUSD": ("coinbase", "SOL-USD", "Coinbase SOL-USD"),
}

TF_MAP = {
    # tf -> (coinbase_granularity_sec, yahoo_interval, yahoo_range)
    "M5": (300, "5m", "5d"),
    "M15": (900, "15m", "10d"),
    "H1": (3600, "60m", "60d"),
}


def http_get(url: str, timeout: int = 20, retries: int = 4) -> bytes:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            last_err = e
            # Yahoo often 429s under burst; back off and retry
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(1.2 * (attempt + 1) + (0.3 * attempt))
                continue
            raise
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(0.8 * (attempt + 1))
                continue
            raise
    raise last_err or RuntimeError("http_get failed")


def normalize_coinbase(raw: list) -> list[dict]:
    # Coinbase: [time, low, high, open, close, volume], newest first
    out = []
    for row in raw:
        t, low, high, o, c, vol = row
        out.append(
            {
                "time": int(t),
                "open": float(o),
                "high": float(high),
                "low": float(low),
                "close": float(c),
                "volume": float(vol),
            }
        )
    out.sort(key=lambda x: x["time"])
    return out


def normalize_yahoo(payload: dict) -> list[dict]:
    result = (payload.get("chart") or {}).get("result")
    if not result:
        err = (payload.get("chart") or {}).get("error")
        raise ValueError(f"Yahoo empty result: {err}")
    r0 = result[0]
    ts = r0.get("timestamp") or []
    quote = (r0.get("indicators") or {}).get("quote") or [{}]
    q = quote[0]
    opens, highs, lows, closes, vols = (
        q.get("open") or [],
        q.get("high") or [],
        q.get("low") or [],
        q.get("close") or [],
        q.get("volume") or [],
    )
    out = []
    for i, t in enumerate(ts):
        o, h, l, c = (
            opens[i] if i < len(opens) else None,
            highs[i] if i < len(highs) else None,
            lows[i] if i < len(lows) else None,
            closes[i] if i < len(closes) else None,
        )
        if o is None or h is None or l is None or c is None:
            continue
        vol = vols[i] if i < len(vols) and vols[i] is not None else 0.0
        out.append(
            {
                "time": int(t),
                "open": float(o),
                "high": float(h),
                "low": float(l),
                "close": float(c),
                "volume": float(vol),
            }
        )
    return out



def disk_cache_path(symbol: str, tf: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{symbol}_{tf}.json"


def write_disk_cache(payload: dict) -> None:
    try:
        path = disk_cache_path(payload["symbol"], payload["tf"])
        path.write_text(json.dumps(payload))
    except Exception:
        pass


def read_disk_cache(symbol: str, tf: str) -> dict | None:
    path = disk_cache_path(symbol, tf)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        data["from_disk"] = True
        data["note"] = (data.get("note") or "") + " · stale disk cache (live fetch unavailable)"
        return data
    except Exception:
        return None


def fetch_candles(symbol: str, tf: str) -> dict:
    if symbol not in SYMBOLS:
        raise ValueError(f"Unknown symbol {symbol}. Known: {list(SYMBOLS)}")
    if tf not in TF_MAP:
        raise ValueError(f"Unknown TF {tf}. Known: {list(TF_MAP)}")

    provider, remote, note = SYMBOLS[symbol]
    gran, y_int, y_range = TF_MAP[tf]
    cache_key = f"{symbol}:{tf}"

    now = time.time()
    if cache_key in CACHE:
        exp, body, ctype = CACHE[cache_key]
        if now < exp:
            return json.loads(body.decode())

    try:
        if provider == "coinbase":
            # Coinbase returns max ~300 candles; for H1/M15 that's enough for OB scan
            url = f"https://api.exchange.coinbase.com/products/{remote}/candles?granularity={gran}"
            raw = json.loads(http_get(url).decode())
            candles = normalize_coinbase(raw)
            source = f"coinbase:{remote}"
        else:
            hosts = (
                "https://query2.finance.yahoo.com",
                "https://query1.finance.yahoo.com",
            )
            raw = None
            last_err: Exception | None = None
            for host in hosts:
                url = (
                    f"{host}/v8/finance/chart/"
                    f"{urllib.parse.quote(remote)}?interval={y_int}&range={y_range}"
                )
                try:
                    raw = json.loads(http_get(url).decode())
                    break
                except Exception as e:
                    last_err = e
                    time.sleep(0.5)
            if raw is None:
                raise last_err or RuntimeError("Yahoo fetch failed")
            candles = normalize_yahoo(raw)
            source = f"yahoo:{remote}"

        payload = {
            "symbol": symbol,
            "tf": tf,
            "source": source,
            "note": note,
            "count": len(candles),
            "cached_for_sec": CACHE_TTL,
            "candles": candles,
            "from_disk": False,
        }
        write_disk_cache(payload)
        body = json.dumps(payload).encode()
        CACHE[cache_key] = (now + CACHE_TTL, body, "application/json")
        return payload
    except Exception as e:
        stale = read_disk_cache(symbol, tf)
        if stale and stale.get("candles"):
            stale["live_error"] = str(e)
            body = json.dumps(stale).encode()
            # shorter memory cache for stale so we retry live sooner
            CACHE[cache_key] = (now + 20, body, "application/json")
            return stale
        raise



def normalize_sync_code(code: str | None) -> str | None:
    """Normalize sync code to upper; return None if invalid."""
    if not code or not isinstance(code, str):
        return None
    c = code.strip().upper()
    if not SYNC_CODE_RE.match(c):
        return None
    return c


def checks_file_for_code(code: str) -> Path:
    digest = hashlib.sha256(code.encode("utf-8")).hexdigest()
    return CHECKS_DIR / f"{digest}.json"


def ensure_checks_dir() -> None:
    CHECKS_DIR.mkdir(parents=True, exist_ok=True)


def load_checks_for_code(code: str) -> dict:
    """Return {ok, code, checks, updated_at}. Missing file → empty checks."""
    path = checks_file_for_code(code)
    if not path.is_file():
        return {"ok": True, "code": code, "checks": {}, "updated_at": None}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"ok": True, "code": code, "checks": {}, "updated_at": None}
    checks = data.get("checks") if isinstance(data, dict) else {}
    if not isinstance(checks, dict):
        checks = {}
    # Only keep truthy checked keys as 1
    clean = {str(k): 1 for k, v in checks.items() if v}
    updated_at = data.get("updated_at") if isinstance(data, dict) else None
    return {"ok": True, "code": code, "checks": clean, "updated_at": updated_at}


def save_checks_for_code(code: str, checks: dict) -> dict:
    """Persist checks map; return {ok, code, checks, updated_at}."""
    if not isinstance(checks, dict):
        raise ValueError("checks must be an object")
    clean = {str(k): 1 for k, v in checks.items() if v}
    ensure_checks_dir()
    updated_at = int(time.time())
    path = checks_file_for_code(code)
    payload = {"checks": clean, "updated_at": updated_at}
    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return {"ok": True, "code": code, "checks": clean, "updated_at": updated_at}


def parse_checks_put_body(raw: bytes) -> tuple[str, dict]:
    """Validate PUT body; return (normalized_code, checks). Raises ValueError."""
    if len(raw) > MAX_CHECKS_BODY:
        raise ValueError("payload too large")
    try:
        obj = json.loads(raw.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"invalid JSON: {e}") from e
    if not isinstance(obj, dict):
        raise ValueError("body must be a JSON object")
    code = normalize_sync_code(obj.get("code"))
    if not code:
        raise ValueError("invalid or missing code (expected OB- + 8–12 chars A-Z2-9)")
    checks = obj.get("checks")
    if not isinstance(checks, dict):
        raise ValueError("checks must be an object")
    return code, checks


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            return self._json(200, {"ok": True, "symbols": list(SYMBOLS.keys()), "tfs": list(TF_MAP.keys())})
        if parsed.path == "/api/symbols":
            return self._json(
                200,
                {
                    "symbols": [
                        {"id": k, "provider": v[0], "remote": v[1], "note": v[2]} for k, v in SYMBOLS.items()
                    ]
                },
            )
        if parsed.path == "/api/candles":
            qs = urllib.parse.parse_qs(parsed.query)
            symbol = (qs.get("symbol") or ["BTCUSD"])[0].upper()
            tf = (qs.get("tf") or ["M15"])[0].upper()
            try:
                data = fetch_candles(symbol, tf)
                return self._json(200, data)
            except Exception as e:
                return self._json(502, {"error": str(e), "symbol": symbol, "tf": tf})
        if parsed.path == "/api/checks":
            qs = urllib.parse.parse_qs(parsed.query)
            code = normalize_sync_code((qs.get("code") or [""])[0])
            if not code:
                return self._json(400, {"ok": False, "error": "invalid or missing code"})
            return self._json(200, load_checks_for_code(code))
        return super().do_GET()

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/checks":
            self.send_error(404, "Not Found")
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            return self._json(400, {"ok": False, "error": "empty body"})
        if length > MAX_CHECKS_BODY:
            return self._json(413, {"ok": False, "error": "payload too large"})
        raw = self.rfile.read(length)
        try:
            code, checks = parse_checks_put_body(raw)
            result = save_checks_for_code(code, checks)
            return self._json(200, result)
        except ValueError as e:
            return self._json(400, {"ok": False, "error": str(e)})
        except Exception as e:
            return self._json(500, {"ok": False, "error": str(e)})

    def _json(self, code: int, obj: dict):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # quieter logs
        if args and str(args[0]).startswith("/api/"):
            super().log_message(fmt, *args)


def main():
    import os
    import sys

    # Local: python3 server.py [port] ; Render/Railway: bind 0.0.0.0:$PORT
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = int(os.environ.get("PORT", str(PORT)))
    host = os.environ.get("HOST", "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"OB Scanner → http://{host}:{port}/")
    print(f"Serving {ROOT}")
    print("API: GET /api/candles?symbol=BTCUSD&tf=M15 · GET/PUT /api/checks")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
