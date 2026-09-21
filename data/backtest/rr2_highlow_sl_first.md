> **Brief honesty check** (`--ambiguous sl_first`, same far entry + RR 2). Primary deliverable is `rr2_highlow_skip` / `latest.*`. Totals: closed **255**, WR **43.53%**, sum R **+78.0**, PF **1.54** (13 same-bar both-hit bars counted as SL losses vs skipped in primary).

# 5★ Order Block Backtest

Generated: **2026-09-21 01:23 CEST** (Europe/Paris)

Universe: all `20` symbols × TF M5, M15, H1. Only OBs with **stars == 5 at detection time** (fresh/unmitigated). Entry-side **`far`** + TP **2.0R** matches **current live** `app.js` `computeSlTp` (since commit `03fe84b`; near=bull low/bear high; far=bull high/bear low); buffer 7.5% of range beyond OB extreme. This report remains a historical backtest of that rule. Wick-touch entry. Entry mode: **`next_bar`** (same_bar = earliest fill on detection bar i; next_bar = earliest i+1). Ambiguous (both SL+TP same candle): **`sl_first`** (sl_first = count as SL loss; skip = exclude from WR/R like timeouts).

> **Note:** Historical backtest of the **live** far-edge + 2R rule (commit `03fe84b`). CLI research defaults remain `--entry-side near` / `--rr 1.5`.

## Totals

| Metric | Value |
|---|---|
| Signals (5★) | 322 |
| Closed trades | 255 |
| Wins | 111 |
| Losses | 144 |
| Timeouts (excluded from winrate) | 67 |
| Ambiguous (excluded from winrate) | 0 |
| Winrate | 43.53% |
| Avg R | 0.3059 |
| Sum R | 78.0000 |
| Profit factor | 1.54 |

## By timeframe

| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| M5 | 79 | 46.84% | 0.4051 | 32.0000 | 1.76 | 25 | 0 |
| M15 | 62 | 41.94% | 0.2581 | 16.0000 | 1.44 | 16 | 0 |
| H1 | 114 | 42.11% | 0.2632 | 30.0000 | 1.45 | 26 | 0 |

## By symbol

| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| AUDUSD | 17 | 52.94% | 0.5882 | 10.0000 | 2.25 | 0 | 0 |
| BTCUSD | 4 | 0.00% | -1.0000 | -4.0000 | 0.00 | 1 | 0 |
| ETHUSD | 6 | 83.33% | 1.5000 | 9.0000 | 10.00 | 1 | 0 |
| EURJPY | 8 | 37.50% | 0.1250 | 1.0000 | 1.20 | 4 | 0 |
| EURUSD | 17 | 41.18% | 0.2353 | 4.0000 | 1.40 | 2 | 0 |
| GBPJPY | 12 | 66.67% | 1.0000 | 12.0000 | 4.00 | 4 | 0 |
| GBPUSD | 18 | 22.22% | -0.3333 | -6.0000 | 0.57 | 7 | 0 |
| NAS100 | 17 | 41.18% | 0.2353 | 4.0000 | 1.40 | 3 | 0 |
| NZDUSD | 15 | 40.00% | 0.2000 | 3.0000 | 1.33 | 7 | 0 |
| OIL | 14 | 35.71% | 0.0714 | 1.0000 | 1.11 | 3 | 0 |
| RUSSELL | 19 | 42.11% | 0.2632 | 5.0000 | 1.45 | 3 | 0 |
| SILVER | 15 | 53.33% | 0.6000 | 9.0000 | 2.29 | 4 | 0 |
| SOLUSD | 6 | 50.00% | 0.5000 | 3.0000 | 2.00 | 1 | 0 |
| SP500 | 18 | 50.00% | 0.5000 | 9.0000 | 2.00 | 1 | 0 |
| US30 | 16 | 43.75% | 0.3125 | 5.0000 | 1.56 | 4 | 0 |
| USDCAD | 9 | 55.56% | 0.6667 | 6.0000 | 2.50 | 2 | 0 |
| USDCHF | 15 | 33.33% | 0.0000 | 0.0000 | 1.00 | 7 | 0 |
| USDJPY | 10 | 60.00% | 0.8000 | 8.0000 | 3.00 | 8 | 0 |
| XAUUSD | 5 | 40.00% | 0.2000 | 1.0000 | 1.33 | 1 | 0 |
| XAUUSD_FUT | 14 | 28.57% | -0.1429 | -2.0000 | 0.80 | 4 | 0 |

## Fetch failures

_None — all symbol/TF pairs loaded (live or disk cache)._

## Data coverage

| Symbol | TF | Bars | Source | From disk |
|---|---|---:|---|---|
| XAUUSD | M5 | 350 | coinbase:PAXG-USD | True |
| XAUUSD | M15 | 350 | coinbase:PAXG-USD | True |
| XAUUSD | H1 | 350 | coinbase:PAXG-USD | True |
| BTCUSD | M5 | 350 | coinbase:BTC-USD | True |
| BTCUSD | M15 | 350 | coinbase:BTC-USD | True |
| BTCUSD | H1 | 350 | coinbase:BTC-USD | True |
| ETHUSD | M5 | 350 | coinbase:ETH-USD | True |
| ETHUSD | M15 | 350 | coinbase:ETH-USD | True |
| ETHUSD | H1 | 350 | coinbase:ETH-USD | True |
| SOLUSD | M5 | 350 | coinbase:SOL-USD | True |
| SOLUSD | M15 | 350 | coinbase:SOL-USD | True |
| SOLUSD | H1 | 350 | coinbase:SOL-USD | True |
| NAS100 | M5 | 931 | yahoo:NQ=F | True |
| NAS100 | M15 | 704 | yahoo:NQ=F | True |
| NAS100 | H1 | 1143 | yahoo:NQ=F | True |
| SP500 | M5 | 1037 | yahoo:ES=F | True |
| SP500 | M15 | 717 | yahoo:ES=F | True |
| SP500 | H1 | 1123 | yahoo:ES=F | True |
| EURUSD | M5 | 1374 | yahoo:EURUSD=X | True |
| EURUSD | M15 | 933 | yahoo:EURUSD=X | True |
| EURUSD | H1 | 1425 | yahoo:EURUSD=X | True |
| GBPUSD | M5 | 1135 | yahoo:GBPUSD=X | True |
| GBPUSD | M15 | 853 | yahoo:GBPUSD=X | True |
| GBPUSD | H1 | 1405 | yahoo:GBPUSD=X | True |
| XAUUSD_FUT | M5 | 1042 | yahoo:GC=F | True |
| XAUUSD_FUT | M15 | 717 | yahoo:GC=F | True |
| XAUUSD_FUT | H1 | 1125 | yahoo:GC=F | True |
| USDJPY | M5 | 1130 | yahoo:USDJPY=X | True |
| USDJPY | M15 | 850 | yahoo:USDJPY=X | True |
| USDJPY | H1 | 1397 | yahoo:USDJPY=X | True |
| AUDUSD | M5 | 1135 | yahoo:AUDUSD=X | True |
| AUDUSD | M15 | 925 | yahoo:AUDUSD=X | True |
| AUDUSD | H1 | 1405 | yahoo:AUDUSD=X | True |
| US30 | M5 | 1042 | yahoo:YM=F | True |
| US30 | M15 | 694 | yahoo:YM=F | True |
| US30 | H1 | 1125 | yahoo:YM=F | True |
| NZDUSD | M5 | 1135 | yahoo:NZDUSD=X | True |
| NZDUSD | M15 | 854 | yahoo:NZDUSD=X | True |
| NZDUSD | H1 | 1406 | yahoo:NZDUSD=X | True |
| USDCAD | M5 | 1132 | yahoo:USDCAD=X | True |
| USDCAD | M15 | 853 | yahoo:USDCAD=X | True |
| USDCAD | H1 | 1407 | yahoo:USDCAD=X | True |
| USDCHF | M5 | 1130 | yahoo:USDCHF=X | True |
| USDCHF | M15 | 851 | yahoo:USDCHF=X | True |
| USDCHF | H1 | 1398 | yahoo:USDCHF=X | True |
| EURJPY | M5 | 1136 | yahoo:EURJPY=X | True |
| EURJPY | M15 | 854 | yahoo:EURJPY=X | True |
| EURJPY | H1 | 1406 | yahoo:EURJPY=X | True |
| GBPJPY | M5 | 1136 | yahoo:GBPJPY=X | True |
| GBPJPY | M15 | 854 | yahoo:GBPJPY=X | True |
| GBPJPY | H1 | 1405 | yahoo:GBPJPY=X | True |
| SILVER | M5 | 1042 | yahoo:SI=F | True |
| SILVER | M15 | 717 | yahoo:SI=F | True |
| SILVER | H1 | 1127 | yahoo:SI=F | True |
| OIL | M5 | 1042 | yahoo:CL=F | True |
| OIL | M15 | 717 | yahoo:CL=F | True |
| OIL | H1 | 1124 | yahoo:CL=F | True |
| RUSSELL | M5 | 1036 | yahoo:RTY=F | True |
| RUSSELL | M15 | 717 | yahoo:RTY=F | True |
| RUSSELL | H1 | 1124 | yahoo:RTY=F | True |

## Caveats

- **Look-ahead in star heuristics (app.js parity):** FVG checks bars through displacement+3; Premium/Discount uses swing high through displacement+5. Signals are confirmed only when that window exists (`CONFIRM_BARS=5`). Trade walk earliest bar depends on `--entry` (same_bar=`dispIndex`, next_bar=`dispIndex+1`), so entry can still occur before full star confirmation — small methodological look-ahead vs a live alert that waits for +5 bars.
- **Mitigation at detection:** `fresh` uses close-through-mid only inside the confirmation window (not the full remaining series), so 5★ means unmitigated *at detection*, matching the brief.
- **Entry mode (`next_bar`):** `same_bar` allows wick-touch fill from `dispIndex` (detection bar); `next_bar` forbids fill on the detection bar (earliest `dispIndex+1`).
- **Same-bar SL/TP ambiguity (`sl_first`):** if both SL and TP wicks print on the entry fill bar (or any later bar): `sl_first` counts as **loss** (conservative); `skip` marks outcome **ambiguous** and excludes from winrate / avg R / sum R / PF (like timeouts).
- **Sample size:** Yahoo ranges are short (`M5→5d`, `M15→10d`, `H1→60d` per `TF_MAP` in server.py). Coinbase returns ~300 candles max. Results are noisy; do not overfit.
- **Proxies:** XAUUSD uses Coinbase PAXG-USD; indices/commodities use Yahoo futures (NQ=F, ES=F, etc.) — not identical to broker CFDs.
- **No costs:** no spread, commission, or slippage modeled.
- **One trade per OB** (dedupe by OB time + side); no pyramiding.
- **Timeouts** (never touched entry, or still open at series end) and **ambiguous** (both SL+TP same candle when `--ambiguous skip`) are **excluded** from winrate / avg R / sum R / profit factor.
- **Entry-side (`far`):** `far` = **live** (bull=OB high, bear=OB low, since 03fe84b); `near` = older research / CLI default (bull=OB low, bear=OB high). SL still beyond the opposite OB extreme with the same buffer formula.
- **RR (`2.0`):** TP = entry ± RR×R; **live** app uses 2R (since 03fe84b); CLI research default remains 1.5R.
- **Live alignment:** far + 2R matches current live `computeSlTp` (03fe84b). This file documents a historical backtest of that live rule; CLI defaults `--entry-side near` / `--rr 1.5` remain research-only.
