# 5★ Order Block Backtest

Generated: **2026-09-21 15:18 CEST** (Europe/Paris)

Universe: all `20` symbols × TF M15, H1. Only OBs with **stars == 5 at detection time** (fresh/unmitigated). **Research variant** (CLI defaults; live panel is far + 2.0R since `03fe84b`): entry-side **`far`** (near=bull low/bear high; mid=(h+l)/2; far=bull high/bear low), buffer 7.5% of range beyond OB extreme, TP **1.5R**. Wick-touch entry. Entry mode: **`next_bar`** (same_bar = earliest fill on detection bar i; next_bar = earliest i+1). Ambiguous (both SL+TP same candle): **`skip`** (sl_first/count_as_loss = count as SL loss; skip = exclude from WR/R like timeouts).

> **Note:** CLI research run (`--entry-side near` / `--rr 1.5` by default). Live panel `computeSlTp` is far + 2.0R since commit `03fe84b`.

## Totals

| Metric | Value |
|---|---|
| Signals (5★) | 218 |
| Closed trades | 168 |
| Wins | 91 |
| Losses | 77 |
| Timeouts (excluded from winrate) | 41 |
| Ambiguous (excluded from winrate) | 9 |
| Winrate | 54.17% |
| Avg R | 0.3542 |
| Sum R | 59.5000 |
| Profit factor | 1.77 |

## By timeframe

| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| M15 | 60 | 53.33% | 0.3333 | 20.0000 | 1.71 | 16 | 2 |
| H1 | 108 | 54.63% | 0.3657 | 39.5000 | 1.81 | 25 | 7 |

## By symbol

| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| AUDUSD | 10 | 60.00% | 0.5000 | 5.0000 | 2.25 | 0 | 0 |
| BTCUSD | 3 | 33.33% | -0.1667 | -0.5000 | 0.75 | 1 | 1 |
| ETHUSD | 3 | 100.00% | 1.5000 | 4.5000 | ∞ (no losses) | 0 | 0 |
| EURJPY | 7 | 42.86% | 0.0714 | 0.5000 | 1.12 | 2 | 0 |
| EURUSD | 12 | 41.67% | 0.0417 | 0.5000 | 1.07 | 2 | 2 |
| GBPJPY | 9 | 55.56% | 0.3889 | 3.5000 | 1.88 | 1 | 0 |
| GBPUSD | 13 | 23.08% | -0.4231 | -5.5000 | 0.45 | 3 | 1 |
| NAS100 | 13 | 53.85% | 0.3462 | 4.5000 | 1.75 | 1 | 0 |
| NZDUSD | 9 | 66.67% | 0.6667 | 6.0000 | 3.00 | 6 | 0 |
| OIL | 8 | 37.50% | -0.0625 | -0.5000 | 0.90 | 0 | 1 |
| RUSSELL | 14 | 64.29% | 0.6071 | 8.5000 | 2.70 | 2 | 1 |
| SILVER | 6 | 66.67% | 0.6667 | 4.0000 | 3.00 | 2 | 0 |
| SOLUSD | 5 | 80.00% | 1.0000 | 5.0000 | 6.00 | 1 | 0 |
| SP500 | 11 | 54.55% | 0.3636 | 4.0000 | 1.80 | 1 | 1 |
| US30 | 9 | 55.56% | 0.3889 | 3.5000 | 1.88 | 4 | 1 |
| USDCAD | 8 | 87.50% | 1.1875 | 9.5000 | 10.50 | 2 | 0 |
| USDCHF | 12 | 50.00% | 0.2500 | 3.0000 | 1.50 | 5 | 1 |
| USDJPY | 4 | 75.00% | 0.8750 | 3.5000 | 4.50 | 5 | 0 |
| XAUUSD | 4 | 25.00% | -0.3750 | -1.5000 | 0.50 | 1 | 0 |
| XAUUSD_FUT | 8 | 50.00% | 0.2500 | 2.0000 | 1.50 | 2 | 0 |

## Fetch failures

_None — all symbol/TF pairs loaded (live or disk cache)._

## Data coverage

| Symbol | TF | Bars | Source | From disk |
|---|---|---:|---|---|
| XAUUSD | M15 | 350 | coinbase:PAXG-USD | True |
| XAUUSD | H1 | 350 | coinbase:PAXG-USD | True |
| BTCUSD | M15 | 350 | coinbase:BTC-USD | True |
| BTCUSD | H1 | 350 | coinbase:BTC-USD | True |
| ETHUSD | M15 | 350 | coinbase:ETH-USD | True |
| ETHUSD | H1 | 350 | coinbase:ETH-USD | True |
| SOLUSD | M15 | 350 | coinbase:SOL-USD | True |
| SOLUSD | H1 | 350 | coinbase:SOL-USD | True |
| NAS100 | M15 | 704 | yahoo:NQ=F | True |
| NAS100 | H1 | 1143 | yahoo:NQ=F | True |
| SP500 | M15 | 717 | yahoo:ES=F | True |
| SP500 | H1 | 1123 | yahoo:ES=F | True |
| EURUSD | M15 | 933 | yahoo:EURUSD=X | True |
| EURUSD | H1 | 1425 | yahoo:EURUSD=X | True |
| GBPUSD | M15 | 853 | yahoo:GBPUSD=X | True |
| GBPUSD | H1 | 1405 | yahoo:GBPUSD=X | True |
| XAUUSD_FUT | M15 | 717 | yahoo:GC=F | True |
| XAUUSD_FUT | H1 | 1125 | yahoo:GC=F | True |
| USDJPY | M15 | 850 | yahoo:USDJPY=X | True |
| USDJPY | H1 | 1397 | yahoo:USDJPY=X | True |
| AUDUSD | M15 | 925 | yahoo:AUDUSD=X | True |
| AUDUSD | H1 | 1405 | yahoo:AUDUSD=X | True |
| US30 | M15 | 694 | yahoo:YM=F | True |
| US30 | H1 | 1125 | yahoo:YM=F | True |
| NZDUSD | M15 | 854 | yahoo:NZDUSD=X | True |
| NZDUSD | H1 | 1406 | yahoo:NZDUSD=X | True |
| USDCAD | M15 | 853 | yahoo:USDCAD=X | True |
| USDCAD | H1 | 1407 | yahoo:USDCAD=X | True |
| USDCHF | M15 | 851 | yahoo:USDCHF=X | True |
| USDCHF | H1 | 1398 | yahoo:USDCHF=X | True |
| EURJPY | M15 | 854 | yahoo:EURJPY=X | True |
| EURJPY | H1 | 1406 | yahoo:EURJPY=X | True |
| GBPJPY | M15 | 854 | yahoo:GBPJPY=X | True |
| GBPJPY | H1 | 1405 | yahoo:GBPJPY=X | True |
| SILVER | M15 | 717 | yahoo:SI=F | True |
| SILVER | H1 | 1127 | yahoo:SI=F | True |
| OIL | M15 | 717 | yahoo:CL=F | True |
| OIL | H1 | 1124 | yahoo:CL=F | True |
| RUSSELL | M15 | 717 | yahoo:RTY=F | True |
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
