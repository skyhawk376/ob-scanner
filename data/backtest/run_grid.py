#!/usr/bin/env python3
"""Run entry-side × RR × ambiguous research grid (cache-only). Live app untouched."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PARIS = ZoneInfo("Europe/Paris")
BT = ROOT / "backtest_5star.py"

SIDES = ("near", "mid", "far")
RRS = (1.5, 2.0, 2.5, 3.0)
AMBIGS = ("skip", "sl_first")


def rr_tag(rr: float) -> str:
    # 1.5 -> 15, 2.0 -> 20, 2.5 -> 25, 3.0 -> 30
    return str(int(round(rr * 10)))


def ambig_tag(amb: str) -> str:
    return "skip" if amb == "skip" else "slfirst"


def out_tag(side: str, rr: float, amb: str) -> str:
    return f"grid_{side}_rr{rr_tag(rr)}_{ambig_tag(amb)}"


def extract(row_path: Path) -> dict:
    data = json.loads(row_path.read_text())
    tot = data["totals"]
    signals = tot.get("signals", 0) or 0
    amb = tot.get("ambiguous", 0) or 0
    closed = tot.get("closed", 0) or 0
    timeouts = tot.get("timeouts", 0) or 0
    # potential = closed + ambiguous (ambiguous would have been closed under sl_first)
    potential = closed + amb
    amb_pct = (100.0 * amb / potential) if potential else 0.0
    return {
        "tag": row_path.stem,
        "entry_side": data.get("entry_side"),
        "rr": data.get("rr"),
        "ambiguous_mode": data.get("ambiguous_mode"),
        "entry_mode": data.get("entry_mode"),
        "tfs": ",".join(data.get("tfs") or data.get("rules", {}).get("tfs") or []),
        "signals": signals,
        "closed": closed,
        "wins": tot.get("wins", 0),
        "losses": tot.get("losses", 0),
        "timeouts": timeouts,
        "ambiguous": amb,
        "ambig_pct_of_potential": round(amb_pct, 2),
        "winrate_pct": tot.get("winrate_pct", 0),
        "avg_r": tot.get("avg_r", 0),
        "sum_r": tot.get("sum_r", 0),
        "profit_factor": tot.get("profit_factor"),
        "profit_factor_raw": tot.get("profit_factor_raw"),
        "json": str(row_path.relative_to(ROOT)),
    }


def main() -> int:
    rows: list[dict] = []
    started = datetime.now(PARIS)
    print(f"Grid start {started.isoformat()} — 24 runs cache-only next_bar", flush=True)
    for side in SIDES:
        for rr in RRS:
            for amb in AMBIGS:
                tag = out_tag(side, rr, amb)
                log = OUT / f"run_{tag}.log"
                cmd = [
                    sys.executable,
                    str(BT),
                    "--entry", "next_bar",
                    "--entry-side", side,
                    "--rr", str(rr),
                    "--ambiguous", amb,
                    "--cache-only",
                    "--out-tag", tag,
                ]
                print(f"\n=== {tag} ===", flush=True)
                t0 = time.time()
                with log.open("w") as lf:
                    proc = subprocess.run(
                        cmd, cwd=str(ROOT), stdout=lf, stderr=subprocess.STDOUT
                    )
                elapsed = time.time() - t0
                if proc.returncode != 0:
                    print(f"FAIL {tag} rc={proc.returncode} ({elapsed:.1f}s) — see {log}")
                    rows.append({"tag": tag, "error": f"rc={proc.returncode}", "elapsed_s": round(elapsed, 1)})
                    continue
                named = OUT / f"{tag}.json"
                if not named.exists():
                    print(f"FAIL {tag}: missing {named}")
                    rows.append({"tag": tag, "error": "missing json", "elapsed_s": round(elapsed, 1)})
                    continue
                row = extract(named)
                row["elapsed_s"] = round(elapsed, 1)
                rows.append(row)
                pf = row["profit_factor"]
                print(
                    f"OK {tag}: closed={row['closed']} WR={row['winrate_pct']}% "
                    f"sumR={row['sum_r']} PF={pf} amb={row['ambiguous']} "
                    f"({elapsed:.1f}s)",
                    flush=True,
                )

    # Also snapshot baseline rr2_highlow_skip if present
    baseline = OUT / "rr2_highlow_skip.json"
    if baseline.exists():
        b = extract(baseline)
        b["tag"] = "rr2_highlow_skip (baseline live-like far+2+skip)"
        b["elapsed_s"] = None
        rows.append(b)

    summary_json = OUT / "grid_summary.json"
    summary_csv = OUT / "grid_summary.csv"
    payload = {
        "generated_at": datetime.now(PARIS).isoformat(),
        "started_at": started.isoformat(),
        "entry_mode": "next_bar",
        "cache_only": True,
        "n_runs": 24,
        "rows": rows,
    }
    summary_json.write_text(json.dumps(payload, indent=2))
    fieldnames = [
        "tag", "entry_side", "rr", "ambiguous_mode", "entry_mode", "tfs",
        "signals", "closed", "wins", "losses", "timeouts", "ambiguous",
        "ambig_pct_of_potential", "winrate_pct", "avg_r", "sum_r",
        "profit_factor", "elapsed_s", "error", "json",
    ]
    with summary_csv.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"\nWrote {summary_json}")
    print(f"Wrote {summary_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
