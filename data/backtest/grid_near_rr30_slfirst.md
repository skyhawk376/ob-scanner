# 5★ Order Block Backtest

Generated: **2026-09-21 15:17 CEST** (Europe/Paris)

Universe: all `20` symbols × TF M5, M15, H1. Only OBs with **stars == 5 at detection time** (fresh/unmitigated). **Research variant** (CLI defaults; live panel is far + 2.0R since `03fe84b`): entry-side **`near`** (near=bull low/bear high; mid=(h+l)/2; far=bull high/bear low), buffer 7.5% of range beyond OB extreme, TP **3.0R**. Wick-touch entry. Entry mode: **`next_bar`** (same_bar = earliest fill on detection bar i; next_bar = earliest i+1). Ambiguous (both SL+TP same candle): **`sl_first`** (sl_first/count_as_loss = count as SL loss; skip = exclude from WR/R like timeouts).

> **Note:** CLI research run (`--entry-side near` / `--rr 1.5` by default). Live panel `computeSlTp` is far + 2.0R since commit `03fe84b`.

## Totals

| Metric | Value |
|---|---|
| Signals (5★) | 322 |
| Closed trades | 229 |
| Wins | 44 |
| Losses | 185 |
| Timeouts (excluded from winrate) | 93 |
| Ambiguous (excluded from winrate) | 0 |
| Winrate | 19.21% |
| Avg R | -0.2314 |
| Sum R | -53.0000 |
| Profit factor | 0.71 |

## By timeframe

| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| M5 | 70 | 18.57% | -0.2571 | -18.0000 | 0.68 | 34 | 0 |
| M15 | 55 | 18.18% | -0.2727 | -15.0000 | 0.67 | 23 | 0 |
| H1 | 104 | 20.19% | -0.1923 | -20.0000 | 0.76 | 36 | 0 |

## By symbol

| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| AUDUSD | 15 | 33.33% | 0.3333 | 5.0000 | 1.50 | 2 | 0 |
| BTCUSD | 4 | 0.00% | -1.0000 | -4.0000 | 0.00 | 1 | 0 |
| ETHUSD | 3 | 33.33% | 0.3333 | 1.0000 | 1.50 | 4 | 0 |
| EURJPY | 8 | 0.00% | -1.0000 | -8.0000 | 0.00 | 4 | 0 |
| EURUSD | 17 | 52.94% | 1.1176 | 19.0000 | 3.38 | 2 | 0 |
| GBPJPY | 12 | 8.33% | -0.6667 | -8.0000 | 0.27 | 4 | 0 |
| GBPUSD | 18 | 22.22% | -0.1111 | -2.0000 | 0.86 | 7 | 0 |
| NAS100 | 15 | 13.33% | -0.4667 | -7.0000 | 0.46 | 5 | 0 |
| NZDUSD | 13 | 15.38% | -0.3846 | -5.0000 | 0.55 | 9 | 0 |
| OIL | 14 | 21.43% | -0.1429 | -2.0000 | 0.82 | 3 | 0 |
| RUSSELL | 18 | 22.22% | -0.1111 | -2.0000 | 0.86 | 4 | 0 |
| SILVER | 15 | 6.67% | -0.7333 | -11.0000 | 0.21 | 4 | 0 |
| SOLUSD | 4 | 50.00% | 1.0000 | 4.0000 | 3.00 | 3 | 0 |
| SP500 | 16 | 6.25% | -0.7500 | -12.0000 | 0.20 | 3 | 0 |
| US30 | 12 | 25.00% | 0.0000 | 0.0000 | 1.00 | 8 | 0 |
| USDCAD | 6 | 33.33% | 0.3333 | 2.0000 | 1.50 | 5 | 0 |
| USDCHF | 15 | 13.33% | -0.4667 | -7.0000 | 0.46 | 7 | 0 |
| USDJPY | 7 | 0.00% | -1.0000 | -7.0000 | 0.00 | 11 | 0 |
| XAUUSD | 5 | 20.00% | -0.2000 | -1.0000 | 0.75 | 1 | 0 |
| XAUUSD_FUT | 12 | 8.33% | -0.6667 | -8.0000 | 0.27 | 6 | 0 |

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
- **Entry-side (`near`):** `far` = **live** (bull=OB high, bear=OB low, since 03fe84b); `near` = CLI research default (bull=OB low, bear=OB high); `mid` = OB mid (high+low)/2. SL still beyond the opposite OB extreme with the same buffer formula.
- **RR (`3.0`):** TP = entry ± RR×R; **live** app uses 2R (since 03fe84b); CLI research default remains 1.5R.
- **Live vs this run:** live panel uses far + 2R (03fe84b); this report used CLI research settings (`near` + 3.0R), not current live.
