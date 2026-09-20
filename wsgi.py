"""
PythonAnywhere WSGI entry for OB Scanner.

Reuses candle-fetch logic from server.py. Serves static files + /api/*.
Free PA expects a WSGI callable named `application` — it does not run `python server.py`.

Point the Web tab at this file (or copy its contents into the generated
/var/www/<user>_pythonanywhere_com_wsgi.py).

Project layout on PA (example):
  /home/<user>/ob-scanner/   # this repo
  WSGI: /home/<user>/ob-scanner/wsgi.py
  Working directory / path: /home/<user>/ob-scanner
"""
from __future__ import annotations

import json
import mimetypes
import sys
import traceback
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server  # noqa: E402  — fetch_candles, SYMBOLS, TF_MAP


STATIC_FALLBACK = "index.html"


def _json_response(start_response, status: str, obj: dict, extra_headers=None):
    body = json.dumps(obj).encode("utf-8")
    headers = [
        ("Content-Type", "application/json; charset=utf-8"),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store"),
        ("Access-Control-Allow-Origin", "*"),
    ]
    if extra_headers:
        headers.extend(extra_headers)
    start_response(status, headers)
    return [body]


def _file_response(start_response, path: Path):
    if not path.is_file():
        return None
    data = path.read_bytes()
    ctype, _ = mimetypes.guess_type(str(path))
    if not ctype:
        ctype = "application/octet-stream"
    if path.suffix == ".js":
        ctype = "application/javascript; charset=utf-8"
    elif path.suffix == ".css":
        ctype = "text/css; charset=utf-8"
    elif path.suffix == ".html":
        ctype = "text/html; charset=utf-8"
    headers = [
        ("Content-Type", ctype),
        ("Content-Length", str(len(data))),
        ("Cache-Control", "no-store"),
        ("Access-Control-Allow-Origin", "*"),
    ]
    start_response("200 OK", headers)
    return [data]


def application(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    path = environ.get("PATH_INFO") or "/"
    qs = environ.get("QUERY_STRING") or ""

    if method == "OPTIONS":
        start_response(
            "204 No Content",
            [
                ("Access-Control-Allow-Origin", "*"),
                ("Access-Control-Allow-Methods", "GET, PUT, OPTIONS"),
                ("Access-Control-Allow-Headers", "Content-Type"),
                ("Content-Length", "0"),
            ],
        )
        return [b""]

    if path == "/api/health":
        return _json_response(
            start_response,
            "200 OK",
            {"ok": True, "symbols": list(server.SYMBOLS.keys()), "tfs": list(server.TF_MAP.keys())},
        )

    if path == "/api/symbols":
        return _json_response(
            start_response,
            "200 OK",
            {
                "symbols": [
                    {"id": k, "provider": v[0], "remote": v[1], "note": v[2]}
                    for k, v in server.SYMBOLS.items()
                ]
            },
        )

    if path == "/api/candles":
        params = urllib.parse.parse_qs(qs)
        symbol = (params.get("symbol") or ["BTCUSD"])[0].upper()
        tf = (params.get("tf") or ["M15"])[0].upper()
        try:
            data = server.fetch_candles(symbol, tf)
            return _json_response(start_response, "200 OK", data)
        except Exception as e:
            return _json_response(
                start_response,
                "502 Bad Gateway",
                {"error": str(e), "symbol": symbol, "tf": tf},
            )

    if path == "/api/checks":
        if method == "GET":
            params = urllib.parse.parse_qs(qs)
            code = server.normalize_sync_code((params.get("code") or [""])[0])
            if not code:
                return _json_response(
                    start_response, "400 Bad Request", {"ok": False, "error": "invalid or missing code"}
                )
            return _json_response(start_response, "200 OK", server.load_checks_for_code(code))
        if method == "PUT":
            try:
                length = int(environ.get("CONTENT_LENGTH") or 0)
            except ValueError:
                length = 0
            if length <= 0:
                return _json_response(
                    start_response, "400 Bad Request", {"ok": False, "error": "empty body"}
                )
            if length > server.MAX_CHECKS_BODY:
                return _json_response(
                    start_response, "413 Payload Too Large", {"ok": False, "error": "payload too large"}
                )
            raw = environ["wsgi.input"].read(length)
            try:
                code, checks = server.parse_checks_put_body(raw)
                result = server.save_checks_for_code(code, checks)
                return _json_response(start_response, "200 OK", result)
            except ValueError as e:
                return _json_response(
                    start_response, "400 Bad Request", {"ok": False, "error": str(e)}
                )
            except Exception as e:
                return _json_response(
                    start_response,
                    "500 Internal Server Error",
                    {"ok": False, "error": str(e), "trace": traceback.format_exc()},
                )
        return _json_response(
            start_response, "405 Method Not Allowed", {"ok": False, "error": "use GET or PUT"}
        )

    if path.startswith("/api/"):
        return _json_response(start_response, "404 Not Found", {"error": "unknown api path", "path": path})

    # Static: map / -> index.html, block path traversal
    rel = path.lstrip("/")
    if not rel or rel.endswith("/"):
        rel = (rel + STATIC_FALLBACK) if rel else STATIC_FALLBACK
    candidate = (ROOT / rel).resolve()
    try:
        candidate.relative_to(ROOT)
    except ValueError:
        start_response("403 Forbidden", [("Content-Type", "text/plain")])
        return [b"Forbidden"]

    result = _file_response(start_response, candidate)
    if result is not None:
        return result

    # SPA-ish fallback
    index = ROOT / STATIC_FALLBACK
    result = _file_response(start_response, index)
    if result is not None:
        return result

    start_response("404 Not Found", [("Content-Type", "text/plain")])
    return [b"Not Found"]


# Local smoke: python3 wsgi.py
if __name__ == "__main__":
    from wsgiref.simple_server import make_server

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f"WSGI smoke → http://127.0.0.1:{port}/")
    with make_server("127.0.0.1", port, application) as httpd:
        httpd.serve_forever()
