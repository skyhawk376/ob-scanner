# 5★ Order Block Backtest

Generated: **2026-09-21 15:18 CEST** (Europe/Paris)

Universe: all `20` symbols × TF H1. Only OBs with **stars == 5 at detection time** (fresh/unmitigated). **Research variant** (CLI defaults; live panel is far + 2.0R since `03fe84b`): entry-side **`far`** (near=bull low/bear high; mid=(h+l)/2; far=bull high/bear low), buffer 7.5% of range beyond OB extreme, TP **1.5R**. Wick-touch entry. Entry mode: **`next_bar`** (same_bar = earliest fill on detection bar i; next_bar = earliest i+1). Ambiguous (both SL+TP same candle): **`skip`** (sl_first/count_as_loss = count as SL loss; skip = exclude from WR/R like timeouts).

> **Note:** CLI research run (`--entry-side near` / `--rr 1.5` by default). Live panel `computeSlTp` is far + 2.0R since commit `03fe84b`.

## Totals

| Metric | Value |
|---|---|
| Signals (5★) | 140 |
| Closed trades | 108 |
| Wins | 59 |
| Losses | 49 |
| Timeouts (excluded from winrate) | 25 |
| Ambiguous (excluded from winrate) | 7 |
| Winrate | 54.63% |
| Avg R | 0.3657 |
| Sum R | 39.5000 |
| Profit factor | 1.81 |

## By timeframe

| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| H1 | 108 | 54.63% | 0.3657 | 39.5000 | 1.81 | 25 | 7 |

## By symbol

| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| AUDUSD | 7 | 57.14% | 0.4286 | 3.0000 | 2.00 | 0 | 0 |
| BTCUSD | 2 | 50.00% | 0.2500 | 0.5000 | 1.50 | 0 | 1 |
| ETHUSD | 1 | 100.00% | 1.5000 | 1.5000 | ∞ (no losses) | 0 | 0 |
| EURJPY | 5 | 60.00% | 0.5000 | 2.5000 | 2.25 | 1 | 0 |
| EURUSD | 6 | 33.33% | -0.1667 | -1.0000 | 0.75 | 2 | 2 |
| GBPJPY | 3 | 100.00% | 1.5000 | 4.5000 | ∞ (no losses) | 1 | 0 |
| GBPUSD | 9 | 33.33% | -0.1667 | -1.5000 | 0.75 | 1 | 1 |
| NAS100 | 9 | 44.44% | 0.1111 | 1.0000 | 1.20 | 0 | 0 |
| NZDUSD | 8 | 75.00% | 0.8750 | 7.0000 | 4.50 | 3 | 0 |
| OIL | 5 | 40.00% | 0.0000 | 0.0000 | 1.00 | 0 | 1 |
| RUSSELL | 10 | 50.00% | 0.2500 | 2.5000 | 1.50 | 2 | 1 |
| SILVER | 3 | 66.67% | 0.6667 | 2.0000 | 3.00 | 2 | 0 |
| SOLUSD | 3 | 66.67% | 0.6667 | 2.0000 | 3.00 | 0 | 0 |
| SP500 | 9 | 55.56% | 0.3889 | 3.5000 | 1.88 | 1 | 0 |
| US30 | 6 | 50.00% | 0.2500 | 1.5000 | 1.50 | 2 | 0 |
| USDCAD | 8 | 87.50% | 1.1875 | 9.5000 | 10.50 | 1 | 0 |
| USDCHF | 6 | 50.00% | 0.2500 | 1.5000 | 1.50 | 3 | 1 |
| USDJPY | 1 | 100.00% | 1.5000 | 1.5000 | ∞ (no losses) | 3 | 0 |
| XAUUSD | 4 | 25.00% | -0.3750 | -1.5000 | 0.50 | 1 | 0 |
| XAUUSD_FUT | 3 | 33.33% | -0.1667 | -0.5000 | 0.75 | 2 | 0 |

## Fetch failures

_None — all symbol/TF pairs loaded (live or disk cache)._

## Data coverage

| Symbol | TF | Bars | Source | From disk |
|---|---|---:|---|---|
| XAUUSD | H1 | 350 | coinbase:PAXG-USD | True |
| BTCUSD | H1 | 350 | coinbase:BTC-USD | True |
| ETHUSD | H1 | 350 | coinbase:ETH-USD | True |
| SOLUSD | H1 | 350 | coinbase:SOL-USD | True |
| NAS100 | H1 | 1143 | yahoo:NQ=F | True |
| SP500 | H1 | 1123 | yahoo:ES=F | True |
| EURUSD | H1 | 1425 | yahoo:EURUSD=X | True |
| GBPUSD | H1 | 1405 | yahoo:GBPUSD=X | True |
| XAUUSD_FUT | H1 | 1125 | yahoo:GC=F | True |
| USDJPY | H1 | 1397 | yahoo:USDJPY=X | True |
| AUDUSD | H1 | 1405 | yahoo:AUDUSD=X | True |
| US30 | H1 | 1125 | yahoo:YM=F | True |
| NZDUSD | H1 | 1406 | yahoo:NZDUSD=X | True |
| USDCAD | H1 | 1407 | yahoo:USDCAD=X | True |
| USDCHF | H1 | 1398 | yahoo:USDCHF=X | True |
| EURJPY | H1 | 1406 | yahoo:EURJPY=X | True |
| GBPJPY | H1 | 1405 | yahoo:GBPJPY=X | True |
| SILVER | H1 | 1127 | yahoo:SI=F | True |
| OIL | H1 | 1124 | yahoo:CL=F | True |
| RUSSELL | H1 | 1124 | yahoo:RTY=F | True |

## Caveats

- **Look-ahead in star heuristics (app.js parity):** FVG checks bars through displacement+3; Premium/Discount uses swing high through displacement+5. Signals are confirmed only when that window exists (`CONFIRM_BARS=5`). Trade walk earliest bar depends on `--entry` (same_bar=`dispIndex`, next_bar=`dispIndex+1`), so entry can still occur before full star confirmation — small methodological look-ahead vs a live alert that waits for +5 bars.
- **Mitigation at detection:** `fresh` uses close-through-mid only inside the confirmation window (not the full remaining series), so 5★ means unmitigated *at detection*, matching the brief.
- **Entry mode (`next_bar`):** `same_bar` allows wick-touch fill from `dispIndex` (detection bar); `next_bar` forbids fill on the detection bar (earliest `dispIndex+1`).
- **Same-bar SL/TP ambiguity (`skip`):** if both SL and TP wicks print on the entry fill bar (or any later bar): `sl_first` counts as **loss** (conservative); `skip` marks outcome **ambiguous** and excludes from winrate / avg R / sum R / PF (like timeouts).
- **Sample size:** Yahoo ranges are short (`M5→5d`, `M15→10d`, `H1→60d` per `TF_MAP` in server.py). Coinbase returns ~300 candles max. Results are noisy; do not overfit.
- **Proxies:** XAUUSD uses Coinbase PAXG-USD; indices/commodities use Yahoo futures (NQ=F, ES=F, etc.) — not identical to broker CFDs.
- **No costs:** no spread, commission, or slippage modeled.
- **One trade per OB** (dedupe by OB time + side); no pyramiding.
- **Timeouts** (never touched entry, or still open at series end) and **ambiguous** (both SL+TP same candle when `--ambiguous skip`) are **excluded** from winrate / avg R / sum R / profit factor.
- **Entry-side (`far`):** `far` = **live** (bull=OB high, bear=OB low, since 03fe84b); `near` = CLI research default (bull=OB low, bear=OB high); `mid` = OB mid (high+low)/2. SL still beyond the opposite OB extreme with the same buffer formula.
- **RR (`1.5`):** TP = entry ± RR×R; **live** app uses 2R (since 03fe84b); CLI research default remains 1.5R.
- **Live vs this run:** live panel uses far + 2R (03fe84b); this report used CLI research settings (`far` + 1.5R), not current live.
