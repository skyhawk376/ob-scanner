# OB 5★ Backtest Grid Ranking

Generated: **2026-09-21 15:18 CEST** (Europe/Paris)

Research-only sweep. **Live panel still `far` + 2R** (`app.js` / `computeSlTp` since `03fe84b`) — **no live change**.

## Grid design

- Entry mode: **`next_bar`** (all runs)
- Cache: **`--cache-only`** (warm `data/backtest/cache` + `cache/`)
- Entry-side: `near`, `mid` *(new)*, `far`
- RR: 1.5, 2.0, 2.5, 3.0
- Ambiguous: `skip` **and** `sl_first` (`count_as_loss` = alias of `sl_first`)
- Universe: all symbols × **M5, M15, H1** (full grid); optional TF subsets below for top configs
- Outputs: `data/backtest/grid_*.json|md`, `grid_summary.csv|json`, this file

## Ranking rules

1. PF ≥ 1.3 **and** sum R > 0
2. n closed ≥ 80 (avoid WR traps on ~50 trades)
3. Among those: maximize **sum R**, then **PF**
4. Always show the `sl_first` companion next to `skip` winners

Configs meeting (1)+(2): **10** / 24

## Ranked table (qualifying)

| Rank | Entry | RR | Ambiguous | Closed | WR | Sum R | PF | Ambig (excl) | Timeouts |
|---:|---|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | `far` | 1.5 | `skip` | 242 | 57.44% | 105.5 | 2.02 | 15 (5.8%) | 65 |
| 2 | `far` | 2.0 | `skip` | 242 | 45.87% | 91.0 | 1.69 | 13 (5.1%) | 67 |
| 3 | `far` | 1.5 | `sl_first` | 257 | 54.09% | 90.5 | 1.77 | 0 (0.0%) | 65 |
| 4 | `mid` | 1.5 | `skip` | 189 | 58.73% | 88.5 | 2.13 | 48 (20.3%) | 85 |
| 5 | `far` | 2.0 | `sl_first` | 255 | 43.53% | 78.0 | 1.54 | 0 (0.0%) | 67 |
| 6 | `far` | 2.5 | `skip` | 248 | 35.48% | 60.0 | 1.38 | 7 (2.7%) | 67 |
| 7 | `mid` | 2.5 | `skip` | 204 | 36.76% | 58.5 | 1.45 | 33 (13.9%) | 85 |
| 8 | `mid` | 2.0 | `skip` | 199 | 42.21% | 53.0 | 1.46 | 38 (16.0%) | 85 |
| 9 | `far` | 2.5 | `sl_first` | 255 | 34.51% | 53.0 | 1.32 | 0 (0.0%) | 67 |
| 10 | `mid` | 1.5 | `sl_first` | 237 | 46.84% | 40.5 | 1.32 | 0 (0.0%) | 85 |

### Skip winners with sl_first companions

| Rank (skip) | Config | Skip: closed / WR / sumR / PF / amb | sl_first companion: closed / WR / sumR / PF |
|---:|---|---|---|
| 1 | `far`+1.5R | 242 / 57.4% / 105.5 / 2.02 / amb=15 | 257 / 54.1% / 90.5 / 1.77 |
| 2 | `far`+2.0R | 242 / 45.9% / 91.0 / 1.69 / amb=13 | 255 / 43.5% / 78.0 / 1.54 |
| 3 | `mid`+1.5R | 189 / 58.7% / 88.5 / 2.13 / amb=48 | 237 / 46.8% / 40.5 / 1.32 |
| 4 | `far`+2.5R | 248 / 35.5% / 60.0 / 1.38 / amb=7 | 255 / 34.5% / 53.0 / 1.32 |
| 5 | `mid`+2.5R | 204 / 36.8% / 58.5 / 1.45 / amb=33 | 237 / 31.6% / 25.5 / 1.16 |
| 6 | `mid`+2.0R | 199 / 42.2% / 53.0 / 1.46 / amb=38 | 237 / 35.4% / 15.0 / 1.10 |

## Recommendation #1

**`far` + 1.5R + `skip`** (`grid_far_rr15_skip`)

- Closed **242**, WR **57.44%**, sum R **105.5**, PF **2.02**, ambiguous excluded **15**, timeouts **65**
- Companion **`sl_first`**: closed **257**, WR **54.09%**, sum R **90.5**, PF **1.77** (still meets PF≥1.3 / n≥80 / sumR>0 — honesty check passes)

### Why #1

- Highest sum R among configs that clear PF≥1.3 and n≥80.
- Far-edge entries keep SL farther (larger R) than near/mid; at 1.5R the TP is closer than live 2R, so more wins print before timeout — lifts WR vs far+2R while PF stays strong.
- Ambiguous load is low (~6% of potential) vs near-edge skip runs that exclude most bars.

### #1 by TF (full universe run)

| TF | Closed | WR | Sum R | PF | Timeouts | Ambiguous |
|---|---:|---:|---:|---:|---:|---:|
| M5 | 74 | 64.86% | 46.0 | 2.77 | 24 | 6 |
| M15 | 60 | 53.33% | 20.0 | 1.71 | 16 | 2 |
| H1 | 108 | 54.63% | 39.5 | 1.81 | 25 | 7 |

### Caveats (apply to all ranks)

- **Short Yahoo windows** (`M5→5d`, `M15→10d`, `H1→60d`); Coinbase ~300 bars — noisy, easy to overfit.
- **No costs** (spread / commission / slippage).
- **Proxies:** XAUUSD→PAXG; indices/commodities→Yahoo futures — not broker CFDs.
- **Look-ahead in star heuristics** (FVG/PD peek past displacement; `CONFIRM_BARS=5`) matching app.js.
- **Ambiguous policy matters:** `skip` inflates WR by dropping same-candle both-hit bars; always read the `sl_first` companion.
- **Live panel unchanged:** production remains **far + 2R**. This grid is research only — do not flip live to 1.5R without forward validation.

### Live baseline for comparison

- `rr2_highlow_skip` / `grid_far_rr20_skip` (live-like): closed **242**, WR **45.87%**, sum R **91.0**, PF **1.69**, amb **13**
- Companion `grid_far_rr20_slfirst`: closed **255**, WR **43.53%**, sum R **78.0**, PF **1.54**
- #1 beats live-like on sum R (105.5 vs 91.0) and PF (2.02 vs 1.69) under the same entry edge, lower RR.

## Near-edge WR traps (do not promote)

`near` + `skip` shows WR 72–85% but **closed ≈ 52–61** with **ambiguous ≈ 168–177** — almost all same-bar both-hits excluded. Under `sl_first`, near configs go deeply negative (sum R −53 to −119, PF ≪ 1). **Disqualified by n&lt;80 and honesty pair.**

| Tag | Closed | WR | Sum R | PF | Ambiguous |
|---|---:|---:|---:|---:|---:|
| `grid_near_rr15_skip` | 52 | 84.62% | 58.0 | 8.25 | 177 |
| `grid_near_rr15_slfirst` | 229 | 19.21% | -119.0 | 0.3568 | 0 |
| `grid_near_rr20_skip` | 54 | 81.48% | 78.0 | 8.8 | 175 |
| `grid_near_rr20_slfirst` | 229 | 19.21% | -97.0 | 0.4757 | 0 |
| `grid_near_rr25_skip` | 57 | 77.19% | 97.0 | 8.4615 | 172 |
| `grid_near_rr25_slfirst` | 229 | 19.21% | -75.0 | 0.5946 | 0 |
| `grid_near_rr30_skip` | 61 | 72.13% | 115.0 | 7.7647 | 168 |
| `grid_near_rr30_slfirst` | 229 | 19.21% | -53.0 | 0.7135 | 0 |

## Full 24-run scoreboard

| Entry | RR | Ambiguous | Closed | WR | Sum R | PF | Ambig | Timeouts | Meets rules? |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|
| `far` | 1.5 | `skip` | 242 | 57.44% | 105.5 | 2.02 | 15 | 65 | YES |
| `far` | 1.5 | `sl_first` | 257 | 54.09% | 90.5 | 1.77 | 0 | 65 | YES |
| `far` | 2.0 | `skip` | 242 | 45.87% | 91.0 | 1.69 | 13 | 67 | YES |
| `far` | 2.0 | `sl_first` | 255 | 43.53% | 78.0 | 1.54 | 0 | 67 | YES |
| `far` | 2.5 | `skip` | 248 | 35.48% | 60.0 | 1.38 | 7 | 67 | YES |
| `far` | 2.5 | `sl_first` | 255 | 34.51% | 53.0 | 1.32 | 0 | 67 | YES |
| `far` | 3.0 | `skip` | 246 | 30.08% | 50.0 | 1.29 | 8 | 68 | no |
| `far` | 3.0 | `sl_first` | 254 | 29.13% | 42.0 | 1.23 | 0 | 68 | no |
| `mid` | 1.5 | `skip` | 189 | 58.73% | 88.5 | 2.13 | 48 | 85 | YES |
| `mid` | 1.5 | `sl_first` | 237 | 46.84% | 40.5 | 1.32 | 0 | 85 | YES |
| `mid` | 2.0 | `skip` | 199 | 42.21% | 53.0 | 1.46 | 38 | 85 | YES |
| `mid` | 2.0 | `sl_first` | 237 | 35.44% | 15.0 | 1.10 | 0 | 85 | no |
| `mid` | 2.5 | `skip` | 204 | 36.76% | 58.5 | 1.45 | 33 | 85 | YES |
| `mid` | 2.5 | `sl_first` | 237 | 31.65% | 25.5 | 1.16 | 0 | 85 | no |
| `mid` | 3.0 | `skip` | 206 | 29.61% | 38.0 | 1.26 | 31 | 85 | no |
| `mid` | 3.0 | `sl_first` | 237 | 25.74% | 7.0 | 1.04 | 0 | 85 | no |
| `near` | 1.5 | `skip` | 52 | 84.62% | 58.0 | 8.25 | 177 | 93 | no |
| `near` | 1.5 | `sl_first` | 229 | 19.21% | -119.0 | 0.36 | 0 | 93 | no |
| `near` | 2.0 | `skip` | 54 | 81.48% | 78.0 | 8.80 | 175 | 93 | no |
| `near` | 2.0 | `sl_first` | 229 | 19.21% | -97.0 | 0.48 | 0 | 93 | no |
| `near` | 2.5 | `skip` | 57 | 77.19% | 97.0 | 8.46 | 172 | 93 | no |
| `near` | 2.5 | `sl_first` | 229 | 19.21% | -75.0 | 0.59 | 0 | 93 | no |
| `near` | 3.0 | `skip` | 61 | 72.13% | 115.0 | 7.76 | 168 | 93 | no |
| `near` | 3.0 | `sl_first` | 229 | 19.21% | -53.0 | 0.71 | 0 | 93 | no |

## Optional TF subsets (top skip configs)

Harness `--tfs` filter; same cache-only candles.

| Tag | TFs | Closed | WR | Sum R | PF | Ambig |
|---|---|---:|---:|---:|---:|---:|
| `grid_far_rr15_skip_tfs_h1` | H1 | 108 | 54.63% | 39.5 | 1.81 | 7 |
| `grid_far_rr15_skip_tfs_m15_h1` | M15,H1 | 168 | 54.17% | 59.5 | 1.77 | 9 |
| `grid_far_rr20_skip_tfs_h1` | H1 | 108 | 44.44% | 36.0 | 1.60 | 6 |
| `grid_far_rr20_skip_tfs_m15_h1` | M15,H1 | 168 | 44.05% | 54.0 | 1.57 | 8 |
| `grid_mid_rr15_skip_tfs_h1` | H1 | 85 | 62.35% | 47.5 | 2.48 | 22 |
| `grid_mid_rr15_skip_tfs_m15_h1` | M15,H1 | 133 | 60.90% | 69.5 | 2.34 | 32 |

H1-only and M15+H1 still look healthy for far+1.5 skip (PF≈1.77–1.81) and mid+1.5 skip (PF≈2.3–2.5) — not a M5-only mirage. Sample sizes drop accordingly.

## Harness notes

- Added `--entry-side mid` (entry=(high+low)/2; SL still beyond opposite extreme, same buffer).
- `--ambiguous count_as_loss` aliased to `sl_first`.
- Optional `--tfs M5,M15,H1` filter.
- Driver: `data/backtest/run_grid.py` (+ `run_grid.sh`).
- **Untouched live files:** `app.js`, `index.html`, `styles.css`, `server.py`, `wsgi.py`, Pine scripts.

## Artifacts

- Per-run: `data/backtest/grid_{near|mid|far}_rr{15|20|25|30}_{skip|slfirst}.{json,md}`
- Summary: `data/backtest/grid_summary.csv`, `grid_summary.json`
- This ranking: `data/backtest/GRID_RANKING.md`
- Live-like reference restored to `latest.md` / `rr2_highlow_skip.*` (= far+2+skip)

