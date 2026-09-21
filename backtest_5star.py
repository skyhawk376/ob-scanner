#!/usr/bin/env python3
"""
Backtest 5★ Order Blocks for Oscar's OB Scanner.

Ports detectOrderBlocks scoring from app.js faithfully.
Universe: all SYMBOLS × M5, M15, H1. Only stars==5 at detection time
(fresh/unmitigated). Trade sim: wick-touch entry, +RR / -1R,
timeout if neither SL nor TP by end.

Entry modes (--entry):
  same_bar  — earliest entry = displacement/detection bar i
  next_bar  — earliest entry = i+1 (no fill on OB detection bar)

Entry price (--entry-side):
  near — bull=OB low, bear=OB high (CLI research default)
  mid  — bull/bear entry = OB mid = (high+low)/2 (research)
  far  — bull=OB high, bear=OB low (matches live panel app.js computeSlTp since 03fe84b)

TP reward (--rr): multiple of R (CLI research default 1.5; live panel uses 2.0)

Ambiguous bar (--ambiguous) when both SL and TP touch the same candle:
  sl_first / count_as_loss — count as SL loss (default, conservative; aliases)
  skip      — exclude like timeouts (ambiguous bucket; not in WR / R)

Optional --tfs M5,M15,H1 filters the TF universe (default: all three).

CLI defaults (--entry-side near, --rr 1.5) are for research experiments.
Live panel = far + 2.0R (commit 03fe84b). This script does not change production app.js.

Usage:
  python3 backtest_5star.py
  python3 backtest_5star.py --entry next_bar --ambiguous skip
  python3 backtest_5star.py --entry next_bar --ambiguous skip --rr 2 --entry-side far --out-tag rr2_highlow_skip
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from server import SYMBOLS, TF_MAP, fetch_candles  # noqa: E402

OUT_DIR = ROOT / "data" / "backtest"
CACHE_DIR = ROOT / "cache"
PARIS = ZoneInfo("Europe/Paris")

# --- Constants mirrored from app.js ---
BODY_LOOKBACK = 20
BREAK_LOOKBACK = 10
BOS_LOOKBACK = 20
BODY_MULT = 1.5
# PD / FVG heuristics peek up to +5 bars past displacement (app.js)
CONFIRM_BARS = 5

SLEEP_SEC = 0.45          # base delay between series
YAHOO_SLEEP_SEC = 1.8     # extra pause before Yahoo live fetches (avoid 429)
YAHOO_RETRY_WAIT = 12.0   # wait on 429 before retry
YAHOO_RETRIES = 3
TFS = ["M5", "M15", "H1"]


# ---------------------------------------------------------------------------
# Scoring / SLTP — faithful port of app.js
# ---------------------------------------------------------------------------

def score_fvg(candles: list, i: int, bullish: bool) -> bool:
    checks = [m for m in (i, i - 1, i + 1) if m >= 1 and m + 1 < len(candles)]
    for m in checks:
        left = candles[m - 1]
        right = candles[m + 1]
        if bullish and right["low"] > left["high"]:
            return True
        if not bullish and right["high"] < left["low"]:
            return True
    for a in range(i + 1, min(len(candles) - 1, i + 3) + 1):
        if bullish and candles[a]["low"] > candles[i]["high"]:
            return True
        if not bullish and candles[a]["high"] < candles[i]["low"]:
            return True
    return False


def score_bos(candles: list, i: int, bullish: bool) -> bool:
    start = max(0, i - BOS_LOOKBACK)
    prior_high = -math.inf
    prior_low = math.inf
    for j in range(start, i):
        prior_high = max(prior_high, candles[j]["high"])
        prior_low = min(prior_low, candles[j]["low"])
    c = candles[i]
    if bullish:
        return c["close"] > prior_high
    return c["close"] < prior_low


def score_sweep(candles: list, i: int, bullish: bool) -> bool:
    if i < 15:
        return False
    if bullish:
        raid_low = math.inf
        prior_low = math.inf
        for j in range(i - 5, i + 1):
            raid_low = min(raid_low, candles[j]["low"])
        for j in range(i - 15, i - 5):
            prior_low = min(prior_low, candles[j]["low"])
        return raid_low < prior_low
    raid_high = -math.inf
    prior_high = -math.inf
    for j in range(i - 5, i + 1):
        raid_high = max(raid_high, candles[j]["high"])
    for j in range(i - 15, i - 5):
        prior_high = max(prior_high, candles[j]["high"])
    return raid_high > prior_high


def score_premium_discount(
    candles: list, i: int, ob_idx: int, mid: float, bullish: bool
) -> bool:
    look_start = max(0, i - 50)
    swing_low = math.inf
    for j in range(look_start, i):
        swing_low = min(swing_low, candles[j]["low"])
    end = min(len(candles) - 1, i + 5)
    swing_high = -math.inf
    frm = min(ob_idx, i)
    for j in range(frm, end + 1):
        swing_high = max(swing_high, candles[j]["high"])
    if not (swing_high > swing_low):
        return False
    half = swing_low + 0.5 * (swing_high - swing_low)
    if bullish:
        return mid <= half
    return mid >= half


def score_ob(candles: list, i: int, ob_idx: int, side: str, mitigated: bool) -> dict:
    bullish = side == "bullish"
    mid = (candles[ob_idx]["high"] + candles[ob_idx]["low"]) / 2
    flags = {
        "fvg": score_fvg(candles, i, bullish),
        "bos": score_bos(candles, i, bullish),
        "sweep": score_sweep(candles, i, bullish),
        "fresh": not mitigated,
        "pd": score_premium_discount(candles, i, ob_idx, mid, bullish),
    }
    stars = sum(1 for v in flags.values() if v)
    return {"stars": stars, "starFlags": flags}


def compute_sl_tp(
    high: float,
    low: float,
    side: str,
    rr: float = 1.5,
    entry_side: str = "near",
) -> dict:
    """
    SL/TP for backtest research.

    entry_side:
      near — bull entry=low, bear entry=high (CLI research default)
      mid  — bull/bear entry = (high+low)/2
      far  — bull entry=high, bear entry=low (live panel since 03fe84b)
    Buffer style unchanged: max(range*0.075, |entry|*1.5e-5) beyond OB extreme.
    SL still beyond the opposite OB extreme (bull: low-buffer; bear: high+buffer).
    TP = entry ± rr * R (live panel uses 2.0 / 1:2; pass --rr 2 --entry-side far).
    Production app.js is NOT modified by this function.
    """
    if entry_side == "near":
        entry = low if side == "bullish" else high
    elif entry_side == "mid":
        entry = (high + low) / 2
    elif entry_side == "far":
        entry = high if side == "bullish" else low
    else:
        raise ValueError(f"unknown entry_side: {entry_side!r}")
    rng = max(0.0, high - low)
    buffer = max(rng * 0.075, abs(entry) * 1.5e-5)
    if side == "bullish":
        sl = low - buffer
        r = entry - sl
        tp = entry + rr * r
    else:
        sl = high + buffer
        r = sl - entry
        tp = entry - rr * r
    return {"entry": entry, "sl": sl, "tp": tp, "r": r, "rr": rr}


def _mitigated_in_range(
    candles: list, side: str, mid: float, start: int, end_excl: int
) -> bool:
    for m in range(start, end_excl):
        cl = candles[m]["close"]
        if side == "bullish" and cl < mid:
            return True
        if side == "bearish" and cl > mid:
            return True
    return False


def find_5star_obs_at_detection(
    candles: list,
    symbol: str,
    tf: str,
    rr: float = 1.5,
    entry_side: str = "near",
) -> list[dict]:
    """
    Walk chronologically. For each displacement, score 'at detection time':
    - Truncate candle view to i+CONFIRM_BARS so FVG/PD match app.js windows
      without using the entire future series.
    - mitigated = close-through-mid only within that confirmation window
      (fresh at detection ⇒ not yet mitigated).
    - No MAX_OBS cap (backtest wants every 5★ signal).
    """
    out: list[dict] = []
    seen: set[tuple] = set()
    if not candles or len(candles) < BODY_LOOKBACK + BREAK_LOOKBACK + 3:
        return out

    for i in range(BODY_LOOKBACK, len(candles)):
        c = candles[i]
        body = abs(c["close"] - c["open"])
        body_sum = 0.0
        for j in range(i - BODY_LOOKBACK, i):
            body_sum += abs(candles[j]["close"] - candles[j]["open"])
        avg_body = body_sum / BODY_LOOKBACK
        strong_body = avg_body > 0 and body >= BODY_MULT * avg_body

        prior_high = -math.inf
        prior_low = math.inf
        start = max(0, i - BREAK_LOOKBACK)
        for j in range(start, i):
            prior_high = max(prior_high, candles[j]["high"])
            prior_low = min(prior_low, candles[j]["low"])

        bull_disp = c["close"] > c["open"] and (strong_body or c["close"] > prior_high)
        bear_disp = c["close"] < c["open"] and (strong_body or c["close"] < prior_low)
        if not bull_disp and not bear_disp:
            continue

        ob_candle = None
        ob_idx = -1
        if bull_disp:
            for k in range(i - 1, max(0, i - 8) - 1, -1):
                if candles[k]["close"] < candles[k]["open"]:
                    ob_candle = candles[k]
                    ob_idx = k
                    break
        else:
            for k in range(i - 1, max(0, i - 8) - 1, -1):
                if candles[k]["close"] > candles[k]["open"]:
                    ob_candle = candles[k]
                    ob_idx = k
                    break
        if ob_candle is None:
            continue

        side = "bullish" if bull_disp else "bearish"
        high = ob_candle["high"]
        low = ob_candle["low"]
        mid = (high + low) / 2

        key = (ob_candle["time"], side)
        if key in seen:
            continue

        # Need confirmation window for FVG (+3) / PD (+5)
        confirm_i = i + CONFIRM_BARS
        if confirm_i >= len(candles):
            continue

        window = candles[: confirm_i + 1]
        mitigated = _mitigated_in_range(window, side, mid, i + 1, confirm_i + 1)
        scored = score_ob(window, i, ob_idx, side, mitigated)
        if scored["stars"] != 5:
            continue

        # Mark seen only once we accept (or always? app skips duplicate time+side
        # among all OBs — we skip duplicates among 5★ candidates the same way)
        seen.add(key)

        sltp = compute_sl_tp(high, low, side, rr=rr, entry_side=entry_side)
        out.append(
            {
                "id": f"{side}-{ob_candle['time']}-{i}",
                "side": side,
                "time": ob_candle["time"],
                "dispTime": c["time"],
                "dispIndex": i,
                "obIndex": ob_idx,
                "confirmIndex": confirm_i,
                "high": high,
                "low": low,
                "mid": mid,
                "entry": sltp["entry"],
                "sl": sltp["sl"],
                "tp": sltp["tp"],
                "r": sltp["r"],
                "rr": rr,
                "entry_side": entry_side,
                "mitigated": mitigated,
                "symbol": symbol,
                "tf": tf,
                "stars": 5,
                "starFlags": scored["starFlags"],
            }
        )
    return out


# ---------------------------------------------------------------------------
# Trade simulation
# ---------------------------------------------------------------------------

def _both_hit_result(ob, exit_idx, entry_idx, ambiguous_mode: str) -> dict:
    """Handle candle that touches both SL and TP.

    count_as_loss is an alias of sl_first (both count the bar as a -1R loss).
    """
    if ambiguous_mode == "skip":
        return _result(ob, "ambiguous", 0.0, exit_idx, entry_idx, "same_bar_both_ambiguous")
    if ambiguous_mode in ("sl_first", "count_as_loss"):
        return _result(ob, "loss", -1.0, exit_idx, entry_idx, "same_bar_both_sl_first")
    raise ValueError(f"unknown ambiguous_mode: {ambiguous_mode!r}")


def simulate_trade(
    candles: list,
    ob: dict,
    entry_mode: str = "next_bar",
    ambiguous_mode: str = "sl_first",
) -> dict:
    """
    Wick-touch entry, then SL/TP.

    entry_mode:
      same_bar — earliest entry bar = dispIndex (detection bar i)
      next_bar — earliest entry bar = dispIndex + 1 (no fill on detection bar)

    ambiguous_mode (both SL and TP on same candle, fill bar or later):
      sl_first — count as SL loss (default)
      skip     — outcome=ambiguous, excluded from WR / R like timeouts

    Win R multiple taken from ob["rr"] (default 1.5).
    """
    side = ob["side"]
    entry = ob["entry"]
    sl = ob["sl"]
    tp = ob["tp"]
    win_r = float(ob.get("rr", 1.5))
    if entry_mode == "next_bar":
        start = ob["dispIndex"] + 1
    elif entry_mode == "same_bar":
        start = ob["dispIndex"]
    else:
        raise ValueError(f"unknown entry_mode: {entry_mode!r}")
    entered = False
    entry_bar = None

    for j in range(start, len(candles)):
        bar = candles[j]
        if not entered:
            touched = (
                bar["low"] <= entry if side == "bullish" else bar["high"] >= entry
            )
            if not touched:
                continue
            entered = True
            entry_bar = j
            # same bar as entry: check SL/TP
            if side == "bullish":
                hit_sl = bar["low"] <= sl
                hit_tp = bar["high"] >= tp
            else:
                hit_sl = bar["high"] >= sl
                hit_tp = bar["low"] <= tp
            if hit_sl and hit_tp:
                return _both_hit_result(ob, j, entry_bar, ambiguous_mode)
            if hit_sl:
                return _result(ob, "loss", -1.0, j, entry_bar, "sl")
            if hit_tp:
                return _result(ob, "win", win_r, j, entry_bar, "tp")
            continue

        # post-entry bars
        if side == "bullish":
            hit_sl = bar["low"] <= sl
            hit_tp = bar["high"] >= tp
        else:
            hit_sl = bar["high"] >= sl
            hit_tp = bar["low"] <= tp
        if hit_sl and hit_tp:
            return _both_hit_result(ob, j, entry_bar, ambiguous_mode)
        if hit_sl:
            return _result(ob, "loss", -1.0, j, entry_bar, "sl")
        if hit_tp:
            return _result(ob, "win", win_r, j, entry_bar, "tp")

    if not entered:
        return _result(ob, "timeout", 0.0, None, None, "never_touched_entry")
    return _result(ob, "timeout", 0.0, None, entry_bar, "open_at_end")


def _result(ob, outcome, r_mult, exit_idx, entry_idx, reason):
    return {
        "symbol": ob["symbol"],
        "tf": ob["tf"],
        "side": ob["side"],
        "obTime": ob["time"],
        "dispTime": ob["dispTime"],
        "dispIndex": ob["dispIndex"],
        "entry": ob["entry"],
        "sl": ob["sl"],
        "tp": ob["tp"],
        "rUnit": ob["r"],
        "outcome": outcome,
        "r": r_mult,
        "exitIndex": exit_idx,
        "entryIndex": entry_idx,
        "reason": reason,
        "starFlags": ob["starFlags"],
    }


# ---------------------------------------------------------------------------
# Data fetch
# ---------------------------------------------------------------------------

def _mirror_payload(data: dict) -> None:
    mirror = OUT_DIR / "cache" / f"{data['symbol']}_{data['tf']}.json"
    mirror.parent.mkdir(parents=True, exist_ok=True)
    slim = {
        "symbol": data["symbol"],
        "tf": data["tf"],
        "source": data.get("source"),
        "note": data.get("note"),
        "count": data.get("count"),
        "from_disk": data.get("from_disk", False),
        "candles": data["candles"],
    }
    mirror.write_text(json.dumps(slim))


def _read_local_cache(symbol: str, tf: str) -> dict | None:
    for path in (
        OUT_DIR / "cache" / f"{symbol}_{tf}.json",
        CACHE_DIR / f"{symbol}_{tf}.json",
    ):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text())
            if data.get("candles"):
                data["from_disk"] = True
                return data
        except Exception:
            continue
    return None


def load_series(symbol: str, tf: str, prefer_cache: bool = False) -> tuple[dict | None, str | None]:
    """Fetch via server.fetch_candles with Yahoo backoff; disk cache fallback."""
    provider = SYMBOLS[symbol][0]
    if prefer_cache:
        cached = _read_local_cache(symbol, tf)
        if cached:
            return cached, None

    last_err: str | None = None
    attempts = YAHOO_RETRIES if provider == "yahoo" else 1
    for attempt in range(attempts):
        try:
            if provider == "yahoo" and attempt == 0:
                time.sleep(YAHOO_SLEEP_SEC)
            data = fetch_candles(symbol, tf)
            if not data or not data.get("candles"):
                last_err = "empty candles"
                continue
            # If live failed inside fetch_candles it may still return disk stale
            _mirror_payload(data)
            return data, None
        except Exception as e:
            last_err = str(e)
            is_429 = "429" in last_err
            if provider == "yahoo" and attempt < attempts - 1:
                wait = YAHOO_RETRY_WAIT * (attempt + 1)
                if is_429:
                    wait *= 1.5
                print(f"  retry {attempt+1}/{attempts} after {wait:.0f}s ({last_err[:60]})", flush=True)
                time.sleep(wait)
                continue
            break

    cached = _read_local_cache(symbol, tf)
    if cached:
        print(f"  using disk cache after live error: {last_err}", flush=True)
        return cached, None
    return None, last_err or "unknown"


# ---------------------------------------------------------------------------
# Stats / report
# ---------------------------------------------------------------------------

def agg_stats(trades: list[dict]) -> dict:
    closed = [t for t in trades if t["outcome"] in ("win", "loss")]
    timeouts = [t for t in trades if t["outcome"] == "timeout"]
    ambiguous = [t for t in trades if t["outcome"] == "ambiguous"]
    wins = [t for t in closed if t["outcome"] == "win"]
    losses = [t for t in closed if t["outcome"] == "loss"]
    sum_r = sum(t["r"] for t in closed)
    avg_r = (sum_r / len(closed)) if closed else 0.0
    winrate = (len(wins) / len(closed) * 100.0) if closed else 0.0
    gross_win = sum(t["r"] for t in wins)
    gross_loss = abs(sum(t["r"] for t in losses))
    pf = (gross_win / gross_loss) if gross_loss > 0 else (float("inf") if gross_win > 0 else 0.0)
    return {
        "signals": len(trades),
        "closed": len(closed),
        "wins": len(wins),
        "losses": len(losses),
        "timeouts": len(timeouts),
        "ambiguous": len(ambiguous),
        "winrate_pct": round(winrate, 2),
        "avg_r": round(avg_r, 4),
        "sum_r": round(sum_r, 4),
        "profit_factor": round(pf, 4) if math.isfinite(pf) else None,
        "profit_factor_raw": pf,
        "gross_win_r": round(gross_win, 4),
        "gross_loss_r": round(gross_loss, 4),
    }


def fmt_pf(pf) -> str:
    if pf is None:
        return "n/a (no losses)" if True else "n/a"
    if isinstance(pf, float) and not math.isfinite(pf):
        return "∞ (no losses)"
    return f"{pf:.2f}"


def build_markdown(payload: dict) -> str:
    tot = payload["totals"]
    now = datetime.now(PARIS).strftime("%Y-%m-%d %H:%M %Z")
    entry_side = payload.get("entry_side", "near")
    rr = float(payload.get("rr", 1.5))
    matches_live = bool(
        payload.get("matches_live_computeSlTp")
        if "matches_live_computeSlTp" in payload
        else (entry_side == "far" and abs(rr - 2.0) < 1e-9)
    )
    if matches_live:
        rule_blurb = (
            f"Entry-side **`{entry_side}`** + TP **{rr}R** matches **current live** "
            f"`app.js` `computeSlTp` (since commit `03fe84b`; "
            f"near=bull low/bear high; mid=(h+l)/2; far=bull high/bear low); "
            f"buffer 7.5% of range beyond OB extreme. "
            f"This report remains a historical backtest of that rule. "
        )
        note_blurb = (
            "> **Note:** Historical backtest of the **live** far-edge + 2R rule "
            "(commit `03fe84b`). CLI research defaults remain "
            "`--entry-side near` / `--rr 1.5`."
        )
        live_caveat = (
            "- **Live alignment:** far + 2R matches current live `computeSlTp` "
            "(03fe84b). This file documents a historical backtest of that live "
            "rule; CLI defaults `--entry-side near` / `--rr 1.5` remain research-only."
        )
    else:
        rule_blurb = (
            f"**Research variant** (CLI defaults; live panel is far + 2.0R "
            f"since `03fe84b`): "
            f"entry-side **`{entry_side}`** "
            f"(near=bull low/bear high; mid=(h+l)/2; far=bull high/bear low), "
            f"buffer 7.5% of range beyond OB extreme, TP **{rr}R**. "
        )
        note_blurb = (
            "> **Note:** CLI research run (`--entry-side near` / `--rr 1.5` by "
            "default). Live panel `computeSlTp` is far + 2.0R since commit `03fe84b`."
        )
        live_caveat = (
            "- **Live vs this run:** live panel uses far + 2R (03fe84b); "
            "this report used CLI research settings "
            f"(`{entry_side}` + {rr}R), not current live."
        )
    lines = [
        f"# 5★ Order Block Backtest",
        f"",
        f"Generated: **{now}** (Europe/Paris)",
        f"",
        f"Universe: all `{len(SYMBOLS)}` symbols × TF "
        f"{', '.join(payload.get('tfs') or payload.get('rules', {}).get('tfs') or TFS)}. "
        f"Only OBs with **stars == 5 at detection time** (fresh/unmitigated). "
        + rule_blurb
        + f"Wick-touch entry. "
        f"Entry mode: **`{payload.get('entry_mode', 'same_bar')}`** "
        f"(same_bar = earliest fill on detection bar i; next_bar = earliest i+1). "
        f"Ambiguous (both SL+TP same candle): **`{payload.get('ambiguous_mode', 'sl_first')}`** "
        f"(sl_first/count_as_loss = count as SL loss; skip = exclude from WR/R like timeouts).",
        f"",
        note_blurb,
        f"",
        f"## Totals",
        f"",
        f"| Metric | Value |",
        f"|---|---|",
        f"| Signals (5★) | {tot['signals']} |",
        f"| Closed trades | {tot['closed']} |",
        f"| Wins | {tot['wins']} |",
        f"| Losses | {tot['losses']} |",
        f"| Timeouts (excluded from winrate) | {tot['timeouts']} |",
        f"| Ambiguous (excluded from winrate) | {tot.get('ambiguous', 0)} |",
        f"| Winrate | {tot['winrate_pct']:.2f}% |",
        f"| Avg R | {tot['avg_r']:.4f} |",
        f"| Sum R | {tot['sum_r']:.4f} |",
        f"| Profit factor | {fmt_pf(tot['profit_factor_raw'])} |",
        f"",
        f"## By timeframe",
        f"",
        f"| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |",
        f"|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    report_tfs = payload.get("tfs") or payload.get("rules", {}).get("tfs") or TFS
    for tf in report_tfs:
        s = payload["by_tf"].get(tf) or agg_stats([])
        lines.append(
            f"| {tf} | {s['closed']} | {s['winrate_pct']:.2f}% | "
            f"{s['avg_r']:.4f} | {s['sum_r']:.4f} | {fmt_pf(s['profit_factor_raw'])} | "
            f"{s['timeouts']} | {s.get('ambiguous', 0)} |"
        )

    lines += [
        f"",
        f"## By symbol",
        f"",
        f"| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |",
        f"|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for sym in sorted(payload["by_symbol"].keys()):
        s = payload["by_symbol"][sym]
        lines.append(
            f"| {sym} | {s['closed']} | {s['winrate_pct']:.2f}% | "
            f"{s['avg_r']:.4f} | {s['sum_r']:.4f} | {fmt_pf(s['profit_factor_raw'])} | "
            f"{s['timeouts']} | {s.get('ambiguous', 0)} |"
        )

    failed = payload.get("fetch_failures") or []
    lines += [
        f"",
        f"## Fetch failures",
        f"",
    ]
    if failed:
        for f in failed:
            lines.append(f"- `{f['symbol']}` `{f['tf']}`: {f['error']}")
    else:
        lines.append("_None — all symbol/TF pairs loaded (live or disk cache)._")

    lines += [
        f"",
        f"## Data coverage",
        f"",
        f"| Symbol | TF | Bars | Source | From disk |",
        f"|---|---|---:|---|---|",
    ]
    for row in payload.get("coverage") or []:
        lines.append(
            f"| {row['symbol']} | {row['tf']} | {row['bars']} | "
            f"{row.get('source', '')} | {row.get('from_disk', False)} |"
        )

    lines += [
        f"",
        f"## Caveats",
        f"",
        f"- **Look-ahead in star heuristics (app.js parity):** FVG checks bars "
        f"through displacement+3; Premium/Discount uses swing high through "
        f"displacement+5. Signals are confirmed only when that window exists "
        f"(`CONFIRM_BARS={CONFIRM_BARS}`). Trade walk earliest bar depends on "
        f"`--entry` (same_bar=`dispIndex`, next_bar=`dispIndex+1`), so entry can "
        f"still occur before full star confirmation — small methodological "
        f"look-ahead vs a live alert that waits for +5 bars.",
        f"- **Mitigation at detection:** `fresh` uses close-through-mid only "
        f"inside the confirmation window (not the full remaining series), so "
        f"5★ means unmitigated *at detection*, matching the brief.",
        f"- **Entry mode (`{payload.get('entry_mode', 'same_bar')}`):** "
        f"`same_bar` allows wick-touch fill from `dispIndex` (detection bar); "
        f"`next_bar` forbids fill on the detection bar (earliest `dispIndex+1`).",
        f"- **Same-bar SL/TP ambiguity (`{payload.get('ambiguous_mode', 'sl_first')}`):** "
        f"if both SL and TP wicks print on the entry fill bar (or any later bar): "
        f"`sl_first` counts as **loss** (conservative); `skip` marks outcome "
        f"**ambiguous** and excludes from winrate / avg R / sum R / PF (like timeouts).",
        f"- **Sample size:** Yahoo ranges are short (`M5→5d`, `M15→10d`, "
        f"`H1→60d` per `TF_MAP` in server.py). Coinbase returns ~300 candles "
        f"max. Results are noisy; do not overfit.",
        f"- **Proxies:** XAUUSD uses Coinbase PAXG-USD; indices/commodities use "
        f"Yahoo futures (NQ=F, ES=F, etc.) — not identical to broker CFDs.",
        f"- **No costs:** no spread, commission, or slippage modeled.",
        f"- **One trade per OB** (dedupe by OB time + side); no pyramiding.",
        f"- **Timeouts** (never touched entry, or still open at series end) and "
        f"**ambiguous** (both SL+TP same candle when `--ambiguous skip`) are "
        f"**excluded** from winrate / avg R / sum R / profit factor.",
        f"- **Entry-side (`{entry_side}`):** "
        f"`far` = **live** (bull=OB high, bear=OB low, since 03fe84b); "
        f"`near` = CLI research default (bull=OB low, bear=OB high); "
        f"`mid` = OB mid (high+low)/2. "
        f"SL still beyond the opposite OB extreme with the same buffer formula.",
        f"- **RR (`{rr}`):** TP = entry ± RR×R; **live** app uses 2R (since 03fe84b); "
        f"CLI research default remains 1.5R.",
        live_caveat,
        f"",
    ]
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Backtest 5★ Order Blocks")
    p.add_argument(
        "--entry",
        choices=("same_bar", "next_bar"),
        default="next_bar",
        help="Earliest entry bar relative to OB detection/displacement: "
        "same_bar=i, next_bar=i+1 (default: next_bar)",
    )
    p.add_argument(
        "--ambiguous",
        choices=("sl_first", "count_as_loss", "skip"),
        default="sl_first",
        help="When both SL and TP touch the same candle (fill bar or later): "
        "sl_first / count_as_loss=count as SL loss (aliases, default); "
        "skip=exclude as ambiguous (like timeouts, not in WR/R)",
    )
    p.add_argument(
        "--rr",
        type=float,
        default=1.5,
        help="Take-profit as multiple of R (CLI research default 1.5; "
        "live panel uses 2.0 — pass --rr 2 with --entry-side far)",
    )
    p.add_argument(
        "--entry-side",
        choices=("near", "mid", "far"),
        default="near",
        dest="entry_side",
        help="OB entry edge: near=bull low/bear high (CLI research default); "
        "mid=(high+low)/2; far=bull high/bear low (live panel since 03fe84b). "
        "SL still beyond opposite extreme with same buffer.",
    )
    p.add_argument(
        "--out-tag",
        default=None,
        help="Named output stem under data/backtest/ (e.g. rr2_highlow_skip). "
        "Also writes latest.json/md. Default: ambiguous_skip or entry mode.",
    )
    p.add_argument(
        "--cache-only",
        action="store_true",
        help="Only use warm disk candle cache (no live fetch)",
    )
    p.add_argument(
        "--tfs",
        default=None,
        help="Comma-separated TF filter, e.g. M5,M15,H1 or H1 (default: all TFS)",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    entry_mode = args.entry
    ambiguous_mode = args.ambiguous
    if ambiguous_mode == "count_as_loss":
        ambiguous_mode = "sl_first"
    rr = float(args.rr)
    entry_side = args.entry_side
    out_tag = args.out_tag
    cache_only = bool(args.cache_only)
    if args.tfs:
        run_tfs = [t.strip().upper() for t in args.tfs.split(",") if t.strip()]
        bad = [t for t in run_tfs if t not in TFS]
        if bad:
            raise SystemExit(f"Unknown TF(s) in --tfs: {bad}; allowed: {TFS}")
        if not run_tfs:
            raise SystemExit("--tfs resolved to empty list")
    else:
        run_tfs = list(TFS)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "cache").mkdir(parents=True, exist_ok=True)

    all_trades: list[dict] = []
    fetch_failures: list[dict] = []
    coverage: list[dict] = []
    by_tf_trades: dict[str, list] = defaultdict(list)
    by_sym_trades: dict[str, list] = defaultdict(list)

    symbols = list(SYMBOLS.keys())
    # Coinbase first (friendlier limits), then Yahoo
    coinbase_syms = [s for s, v in SYMBOLS.items() if v[0] == "coinbase"]
    yahoo_syms = [s for s, v in SYMBOLS.items() if v[0] == "yahoo"]
    ordered = coinbase_syms + yahoo_syms
    pairs = [(s, tf) for s in ordered for tf in run_tfs]
    total_pairs = len(pairs)
    print(
        f"Backtest 5★ OB — {len(symbols)} symbols × {len(run_tfs)} TFs "
        f"({','.join(run_tfs)}) = {total_pairs} series"
    )
    print(
        f"Entry mode: {entry_mode} | Ambiguous: {ambiguous_mode} | "
        f"RR: {rr} | Entry-side: {entry_side} | cache_only={cache_only} | "
        f"Order: Coinbase then Yahoo | base sleep {SLEEP_SEC}s | "
        f"Yahoo pre-sleep {YAHOO_SLEEP_SEC}s\n"
    )

    for n, (symbol, tf) in enumerate(pairs, 1):
        print(f"[{n}/{total_pairs}] {symbol} {tf} ({SYMBOLS[symbol][0]}) ...", flush=True)
        have_cache = (OUT_DIR / "cache" / f"{symbol}_{tf}.json").exists() or (
            CACHE_DIR / f"{symbol}_{tf}.json"
        ).exists()
        if cache_only:
            data = _read_local_cache(symbol, tf)
            if data is None:
                fetch_failures.append(
                    {"symbol": symbol, "tf": tf, "error": "no cache"}
                )
                print("  FAIL (cache-only): no cache")
                continue
            err = None
        else:
            data, err = load_series(symbol, tf, prefer_cache=have_cache)
        if n < total_pairs:
            # shorter sleep when we served from cache
            time.sleep(0.05 if have_cache and data and data.get("from_disk") else SLEEP_SEC)
        if err or data is None:
            fetch_failures.append({"symbol": symbol, "tf": tf, "error": err or "unknown"})
            print(f"  FAIL: {err}")
            continue
        candles = data["candles"]
        coverage.append(
            {
                "symbol": symbol,
                "tf": tf,
                "bars": len(candles),
                "source": data.get("source"),
                "from_disk": bool(data.get("from_disk")),
                "note": data.get("note"),
            }
        )
        obs = find_5star_obs_at_detection(
            candles, symbol, tf, rr=rr, entry_side=entry_side
        )
        print(f"  bars={len(candles)}  5★ signals={len(obs)}  disk={data.get('from_disk')}")
        for ob in obs:
            tr = simulate_trade(
                candles, ob, entry_mode=entry_mode, ambiguous_mode=ambiguous_mode
            )
            all_trades.append(tr)
            by_tf_trades[tf].append(tr)
            by_sym_trades[symbol].append(tr)

    totals = agg_stats(all_trades)
    by_tf = {tf: agg_stats(by_tf_trades.get(tf, [])) for tf in run_tfs}
    by_symbol = {sym: agg_stats(by_sym_trades.get(sym, [])) for sym in sorted(by_sym_trades)}
    # include symbols with zero trades for completeness
    for sym in symbols:
        if sym not in by_symbol:
            by_symbol[sym] = agg_stats([])

    same_bar_rule = (
        "ambiguous/skip if both SL+TP on fill bar (excluded from WR/R)"
        if ambiguous_mode == "skip"
        else "SL first if both on fill bar"
    )
    if entry_side == "far":
        entry_side_desc = (
            "far OB edge (bull=high, bear=low; live panel since 03fe84b)"
        )
    elif entry_side == "mid":
        entry_side_desc = "OB mid ((high+low)/2; research)"
    else:
        entry_side_desc = (
            "near OB edge (bull=low, bear=high; CLI research default)"
        )
    matches_live = entry_side == "far" and abs(rr - 2.0) < 1e-9
    if matches_live:
        rules_note = (
            "Matches live panel computeSlTp (far + 2.0R since 03fe84b); "
            "historical backtest of current live rule"
        )
    else:
        rules_note = (
            "CLI research defaults (near + 1.5R); "
            "live panel is far + 2.0R since 03fe84b"
        )
    payload = {
        "generated_at": datetime.now(PARIS).isoformat(),
        "entry_mode": entry_mode,
        "ambiguous_mode": ambiguous_mode,
        "rr": rr,
        "entry_side": entry_side,
        "tfs": run_tfs,
        "research_only": not matches_live,
        "matches_live_computeSlTp": matches_live,
        "live_app_unchanged": not matches_live,
        "rules": {
            "stars": 5,
            "at_detection": True,
            "confirm_bars": CONFIRM_BARS,
            "entry_mode": entry_mode,
            "ambiguous_mode": ambiguous_mode,
            "rr": rr,
            "entry_side": entry_side,
            "entry_side_desc": entry_side_desc,
            "entry": "wick touch (bull low<=entry, bear high>=entry)",
            "earliest_entry_bar": (
                "dispIndex (detection bar i)"
                if entry_mode == "same_bar"
                else "dispIndex+1 (no fill on detection bar)"
            ),
            "same_bar_sl_tp": same_bar_rule,
            "tp_r": rr,
            "sl_r": -1.0,
            "buffer": "max(range*0.075, |entry|*1.5e-5) beyond OB extreme",
            "tfs": run_tfs,
            "symbols": symbols,
            "note": rules_note,
        },
        "totals": totals,
        "by_tf": by_tf,
        "by_symbol": by_symbol,
        "fetch_failures": fetch_failures,
        "coverage": coverage,
        "trades": all_trades,
    }

    json_path = OUT_DIR / "latest.json"
    md_path = OUT_DIR / "latest.md"
    md = build_markdown(payload)
    json_path.write_text(json.dumps(payload, indent=2))
    md_path.write_text(md)

    # Named copies
    if out_tag:
        tag = out_tag
    elif ambiguous_mode == "skip":
        tag = "ambiguous_skip"
    else:
        tag = entry_mode
    named_json = OUT_DIR / f"{tag}.json"
    named_md = OUT_DIR / f"{tag}.md"
    named_json.write_text(json_path.read_text())
    named_md.write_text(md)

    print("\n" + "=" * 60)
    print(md)
    print("=" * 60)
    print(f"\nWrote {json_path}")
    print(f"Wrote {md_path}")
    print(f"Wrote {named_json}")
    print(f"Wrote {named_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
