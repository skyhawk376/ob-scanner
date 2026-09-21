# 5★ Order Block Backtest

Generated: **2026-09-21 15:17 CEST** (Europe/Paris)

Universe: all `20` symbols × TF M5, M15, H1. Only OBs with **stars == 5 at detection time** (fresh/unmitigated). **Research variant** (CLI defaults; live panel is far + 2.0R since `03fe84b`): entry-side **`mid`** (near=bull low/bear high; mid=(h+l)/2; far=bull high/bear low), buffer 7.5% of range beyond OB extreme, TP **2.0R**. Wick-touch entry. Entry mode: **`next_bar`** (same_bar = earliest fill on detection bar i; next_bar = earliest i+1). Ambiguous (both SL+TP same candle): **`skip`** (sl_first/count_as_loss = count as SL loss; skip = exclude from WR/R like timeouts).

> **Note:** CLI research run (`--entry-side near` / `--rr 1.5` by default). Live panel `computeSlTp` is far + 2.0R since commit `03fe84b`.

## Totals

| Metric | Value |
|---|---|
| Signals (5★) | 322 |
| Closed trades | 199 |
| Wins | 84 |
| Losses | 115 |
| Timeouts (excluded from winrate) | 85 |
| Ambiguous (excluded from winrate) | 38 |
| Winrate | 42.21% |
| Avg R | 0.2663 |
| Sum R | 53.0000 |
| Profit factor | 1.46 |

## By timeframe

| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| M5 | 59 | 40.68% | 0.2203 | 13.0000 | 1.37 | 32 | 13 |
| M15 | 51 | 41.18% | 0.2353 | 12.0000 | 1.40 | 20 | 7 |
| H1 | 89 | 43.82% | 0.3146 | 28.0000 | 1.56 | 33 | 18 |

## By symbol

| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|
| AUDUSD | 15 | 33.33% | 0.0000 | 0.0000 | 1.00 | 2 | 0 |
| BTCUSD | 3 | 33.33% | 0.0000 | 0.0000 | 1.00 | 1 | 1 |
| ETHUSD | 2 | 100.00% | 2.0000 | 4.0000 | ∞ (no losses) | 3 | 2 |
| EURJPY | 8 | 87.50% | 1.6250 | 13.0000 | 14.00 | 4 | 0 |
| EURUSD | 14 | 50.00% | 0.5000 | 7.0000 | 2.00 | 2 | 3 |
| GBPJPY | 8 | 37.50% | 0.1250 | 1.0000 | 1.20 | 4 | 4 |
| GBPUSD | 15 | 20.00% | -0.4000 | -6.0000 | 0.50 | 7 | 3 |
| NAS100 | 14 | 28.57% | -0.1429 | -2.0000 | 0.80 | 4 | 2 |
| NZDUSD | 11 | 27.27% | -0.1818 | -2.0000 | 0.75 | 8 | 3 |
| OIL | 11 | 36.36% | 0.0909 | 1.0000 | 1.14 | 3 | 3 |
| RUSSELL | 15 | 66.67% | 1.0000 | 15.0000 | 4.00 | 4 | 3 |
| SILVER | 12 | 58.33% | 0.7500 | 9.0000 | 2.80 | 4 | 3 |
| SOLUSD | 4 | 50.00% | 0.5000 | 2.0000 | 2.00 | 2 | 1 |
| SP500 | 15 | 33.33% | 0.0000 | 0.0000 | 1.00 | 2 | 2 |
| US30 | 10 | 40.00% | 0.2000 | 2.0000 | 1.33 | 7 | 3 |
| USDCAD | 7 | 71.43% | 1.1429 | 8.0000 | 5.00 | 4 | 0 |
| USDCHF | 13 | 38.46% | 0.1538 | 2.0000 | 1.25 | 7 | 2 |
| USDJPY | 8 | 25.00% | -0.2500 | -2.0000 | 0.67 | 10 | 0 |
| XAUUSD | 3 | 33.33% | 0.0000 | 0.0000 | 1.00 | 1 | 2 |
| XAUUSD_FUT | 11 | 36.36% | 0.0909 | 1.0000 | 1.14 | 6 | 1 |

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
- **Same-bar SL/TP ambiguity (`skip`):** if both SL and TP wicks print on the entry fill bar (or any later bar): `sl_first` counts as **loss** (conservative); `skip` marks outcome **ambiguous** and excludes from winrate / avg R / sum R / PF (like timeouts).
- **Sample size:** Yahoo ranges are short (`M5→5d`, `M15→10d`, `H1→60d` per `TF_MAP` in server.py). Coinbase returns ~300 candles max. Results are noisy; do not overfit.
- **Proxies:** XAUUSD uses Coinbase PAXG-USD; indices/commodities use Yahoo futures (NQ=F, ES=F, etc.) — not identical to broker CFDs.
- **No costs:** no spread, commission, or slippage modeled.
- **One trade per OB** (dedupe by OB time + side); no pyramiding.
- **Timeouts** (never touched entry, or still open at series end) and **ambiguous** (both SL+TP same candle when `--ambiguous skip`) are **excluded** from winrate / avg R / sum R / profit factor.
- **Entry-side (`mid`):** `far` = **live** (bull=OB high, bear=OB low, since 03fe84b); `near` = CLI research default (bull=OB low, bear=OB high); `mid` = OB mid (high+low)/2. SL still beyond the opposite OB extreme with the same buffer formula.
- **RR (`2.0`):** TP = entry ± RR×R; **live** app uses 2R (since 03fe84b); CLI research default remains 1.5R.
- **Live vs this run:** live panel uses far + 2R (03fe84b); this report used CLI research settings (`mid` + 2.0R), not current live.
