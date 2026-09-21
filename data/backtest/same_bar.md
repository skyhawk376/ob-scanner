# 5★ Order Block Backtest

> **Update (2026-09-21):** Since commit `03fe84b`, **live** panel entry/SL/TP is **far** edge (bull high / bear low) + TP **2R**. This run documents historical **near** + **1.5R** research (the rule used when it was generated).

Generated: **2026-09-21 01:08 CEST** (Europe/Paris)

Universe: all `20` symbols × TF M5, M15, H1. Only OBs with **stars == 5 at detection time** (fresh/unmitigated). Entry/SL/TP from `computeSlTp` (bull entry=low, bear entry=high, buffer 7.5% of range, TP 1.5R). Wick-touch entry; on fill bar if both SL and TP could hit → **SL first**. Entry mode: **`same_bar`** (same_bar = earliest fill on detection bar i; next_bar = earliest i+1).

## Totals

| Metric | Value |
|---|---|
| Signals (5★) | 322 |
| Closed trades | 243 |
| Wins | 47 |
| Losses | 196 |
| Timeouts (excluded from winrate) | 79 |
| Winrate | 19.34% |
| Avg R | -0.5165 |
| Sum R | -125.5000 |
| Profit factor | 0.36 |

## By timeframe

| TF | Closed | Winrate | Avg R | Sum R | PF | Timeouts |
|---|---:|---:|---:|---:|---:|---:|
| M5 | 74 | 22.97% | -0.4257 | -31.5000 | 0.45 | 30 |
| M15 | 59 | 16.95% | -0.5763 | -34.0000 | 0.31 | 19 |
| H1 | 110 | 18.18% | -0.5455 | -60.0000 | 0.33 | 30 |

## By symbol

| Symbol | Closed | Winrate | Avg R | Sum R | PF | Timeouts |
|---|---:|---:|---:|---:|---:|---:|
| AUDUSD | 15 | 40.00% | 0.0000 | 0.0000 | 1.00 | 2 |
| BTCUSD | 4 | 0.00% | -1.0000 | -4.0000 | 0.00 | 1 |
| ETHUSD | 3 | 33.33% | -0.1667 | -0.5000 | 0.75 | 4 |
| EURJPY | 9 | 0.00% | -1.0000 | -9.0000 | 0.00 | 3 |
| EURUSD | 17 | 52.94% | 0.3235 | 5.5000 | 1.69 | 2 |
| GBPJPY | 12 | 0.00% | -1.0000 | -12.0000 | 0.00 | 4 |
| GBPUSD | 18 | 22.22% | -0.4444 | -8.0000 | 0.43 | 7 |
| NAS100 | 16 | 18.75% | -0.5312 | -8.5000 | 0.35 | 4 |
| NZDUSD | 13 | 15.38% | -0.6154 | -8.0000 | 0.27 | 9 |
| OIL | 14 | 21.43% | -0.4643 | -6.5000 | 0.41 | 3 |
| RUSSELL | 19 | 21.05% | -0.4737 | -9.0000 | 0.40 | 3 |
| SILVER | 15 | 13.33% | -0.6667 | -10.0000 | 0.23 | 4 |
| SOLUSD | 4 | 25.00% | -0.3750 | -1.5000 | 0.50 | 3 |
| SP500 | 16 | 6.25% | -0.8438 | -13.5000 | 0.10 | 3 |
| US30 | 13 | 30.77% | -0.2308 | -3.0000 | 0.67 | 7 |
| USDCAD | 6 | 33.33% | -0.1667 | -1.0000 | 0.75 | 5 |
| USDCHF | 19 | 10.53% | -0.7368 | -14.0000 | 0.18 | 3 |
| USDJPY | 12 | 8.33% | -0.7917 | -9.5000 | 0.14 | 6 |
| XAUUSD | 5 | 0.00% | -1.0000 | -5.0000 | 0.00 | 1 |
| XAUUSD_FUT | 13 | 15.38% | -0.6154 | -8.0000 | 0.27 | 5 |

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
- **Entry mode (`same_bar`):** `same_bar` allows wick-touch fill from `dispIndex` (detection bar); `next_bar` forbids fill on the detection bar (earliest `dispIndex+1`).
- **Same-bar SL/TP ambiguity:** if both SL and TP wicks print on the entry fill bar (or any later bar), counted as **loss** (SL first) — conservative. Documented choice; next_bar reduces fills that share the OB detection bar with the entry wick.
- **Sample size:** Yahoo ranges are short (`M5→5d`, `M15→10d`, `H1→60d` per `TF_MAP` in server.py). Coinbase returns ~300 candles max. Results are noisy; do not overfit.
- **Proxies:** XAUUSD uses Coinbase PAXG-USD; indices/commodities use Yahoo futures (NQ=F, ES=F, etc.) — not identical to broker CFDs.
- **No costs:** no spread, commission, or slippage modeled.
- **One trade per OB** (dedupe by OB time + side); no pyramiding.
- **Timeouts** (never touched entry, or still open at series end) are **excluded** from winrate / avg R / sum R / profit factor.
- Production scoring in `app.js` was **not** modified.
