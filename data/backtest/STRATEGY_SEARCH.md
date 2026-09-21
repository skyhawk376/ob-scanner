# OB 5★ Strategy Search (phases 2+3 — partial, credit-urgent)

Generated: **2026-09-21 15:38 CEST** (Europe/Paris)

**Live panel unchanged: `far` + 2R** (`03fe84b`). Research only — no `app.js` / deploy.

> **Scope note (urgent crédits):** full phase-2 filter sweeps and walk-forward folds were **cut short**. This file consolidates what was already solid: GRID_RANKING + TF-subset runs + **post-hoc** cost haircuts (−0.2R / −0.4R) and temporal train⅔/test⅓ on existing trade lists. Not re-fetched. Body×2 filter and multi-fold walk-forward **not run**.

## Ranking rules
1. PF ≥ 1.3 and sum R > 0
2. n closed ≥ 80 (all TF) or ≥ 40 (TF subsets, documented)
3. Maximize sum R, then PF; report trades/day; show sl_first companion when available
4. Phase-3 keep if test PF ≥ 1.2 **and** test with −0.2R still PF ≥ 1.2 and sum R > 0

## Trades/day method
Closed trades ÷ calendar span of their `obTime` (unix) in days. Short Yahoo windows → rates are **noisy**, useful for relative pace only (~1/day target is guidance, not a hard filter).

## Phase 1 baseline (reminder)

| Config | Closed | WR | Sum R | PF | Ambig | t/day |
|---|---:|---:|---:|---:|---:|---:|
| far+1.5 skip (#1 grid) | 242 | 57.4% | 105.5 | 2.0243 | 15 | 3.04 |
| far+2.0 skip (live-like) | 242 | 45.9% | 91.0 | 1.6947 | 13 | 3.04 |
| mid+1.5 skip | 189 | 58.7% | 88.5 | 2.1346 | 48 | 2.38 |

## Phase 2 — filters available from existing runs

### TF subsets (far+1.5 and far+2.0, skip)

| Config | TFs | Closed | WR | Sum R | PF | t/day | n≥40? |
|---|---|---:|---:|---:|---:|---:|---|
| far+1.5 skip | H1 | 108 | 54.6% | 39.5 | 1.8061 | 1.38 | yes |
| far+1.5 skip | M15+H1 | 168 | 54.2% | 59.5 | 1.7727 | 2.12 | yes |
| far+2.0 skip | H1 | 108 | 44.4% | 36.0 | 1.6 | 1.38 | yes |
| far+2.0 skip | M15+H1 | 168 | 44.0% | 54.0 | 1.5745 | 2.12 | yes |

### Drop 5 worst symbols (post-hoc on far+1.5 skip)

Ranking symbols by sum R on baseline `grid_far_rr15_skip`. **Dropped:** `GBPUSD, BTCUSD, EURJPY, XAUUSD, EURUSD`

| Symbol | Sum R | PF | Closed | WR |
|---|---:|---:|---:|---:|
| GBPUSD | -7.0 | 0.4615 | 17 | 23.5% |
| BTCUSD | -0.5 | 0.75 | 3 | 33.3% |
| EURJPY | -0.5 | 0.9 | 8 | 37.5% |
| XAUUSD | 0.0 | 1.0 | 5 | 40.0% |
| EURUSD | 2.5 | 1.3125 | 15 | 46.7% |

Recompute without them: closed **194**, WR **62.9%**, sum R **111.0**, PF **2.5417**, t/day **2.49**.
After −0.2R/trade: sum R **72.2**, PF **1.8356**.
Test⅓: n=65, sumR=27.5, PF=1.9821; with −0.2R: sumR=14.5, PF=1.4315 — survive_p3=YES.

### Not run (cut short)
- Displacement body ≥ 2× avg
- Fresh unmitigated-only flag beyond stars==5 already-fresh default
- Full M5-only dedicated grid (TF breakdowns exist inside all-TF runs)
- Multi-fold walk-forward

## Phase 3 — robustness (post-hoc on existing trades)

| Config | TFs | In-sample PF / sumR | Test PF / sumR | Test −0.2R PF / sumR | Survive? |
|---|---|---|---|---|---|
| far+1.5 skip | all | 2.0243 / 105.5 | 1.7838 / 29.0 | 1.2883 / 12.8 | YES |
| far+2.0 skip | all | 1.6947 / 91.0 | 1.4468 / 21.0 | 1.0851 / 4.8 | no |
| mid+1.5 skip | all | 2.1346 / 88.5 | 1.4531 / 14.5 | 1.0495 / 1.9 | no |
| far+1.5 skip | H1 | 1.8061 / 39.5 | 0.8478 / -3.5 | 0.6123 / -10.7 | no |
| far+1.5 skip | M15+H1 | 1.7727 / 59.5 | 1.2097 / 6.5 | 0.8737 / -4.7 | no |
| far+2.0 skip | H1 | 1.6 / 36.0 | 0.6667 / -9.0 | 0.5 / -16.2 | no |
| far+2.0 skip | M15+H1 | 1.5745 / 54.0 | 0.8718 / -5.0 | 0.6538 / -16.2 | no |
| far+1.5 skip drop5 | all−5 | 2.5417 / 111.0 | 1.9821 / 27.5 | 1.4315 / 14.5 | YES |

### Cost haircut (full sample)

| Config | TFs | SumR | PF | −0.2R sumR/PF | −0.4R sumR/PF |
|---|---|---:|---:|---|---|
| far+1.5 | all | 105.5 | 2.0243 | 57.1 / 1.462 | 8.7 / 1.0603 |
| far+2.0 | all | 91.0 | 1.6947 | 42.6 / 1.271 | -5.8 / 0.9684 |
| mid+1.5 | all | 88.5 | 2.1346 | 50.7 / 1.5417 | 12.9 / 1.1181 |

## Top 3 (from available solid configs)

| # | Config | Closed | WR | Sum R | PF | t/day | Test PF | Test −0.2R PF | Survive P3 |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | far+1.5 skip (all−5worst) | 194 | 62.9% | 111.0 | 2.5417 | 2.49 | 1.9821 | 1.4315 | YES |
| 2 | far+1.5 skip (all) | 242 | 57.4% | 105.5 | 2.0243 | 3.04 | 1.7838 | 1.2883 | YES |
| 3 | far+2.0 skip (all) | 242 | 45.9% | 91.0 | 1.6947 | 3.04 | 1.4468 | 1.0851 | no |

## Recommendation #1

**far + 1.5R + skip** (`posthoc_drop5_far_rr15_skip`, universe `all−5worst`)

- Closed **194**, WR **62.9%**, sum R **111.0**, PF **2.5417**, ~**2.49** trades/day
- OOS test⅓ PF **1.9821**; with −0.2R/trade PF **1.4315** — survive_p3=YES

### Why
- Highest sum R among configs we could fully document under the credit cut.
- Far+1.5 remains stronger than live-like far+2 on this sample; live stays far+2 until Oscar/Organisation say otherwise.
- Drop-5 can lift PF/sumR further but is **curve-fit risk** (chosen on full sample) — treat as exploratory.

### Pace vs ~1 trade/day
All-TF far configs print **well above** 1/day on short windows (many symbols × 3 TFs). For a slower pace, prefer **H1-only** subsets (~see TF table) or fewer symbols — not a live change recommendation.

## Caveats
- Short Yahoo / Coinbase windows; easy overfit.
- No spread/commission/slippage in raw runs; −0.2R/−0.4R are **flat haircuts**, not realistic costs.
- Proxies (PAXG, futures) ≠ broker CFDs.
- `skip` ambiguous inflates WR; always read sl_first.
- Temporal split is chronological on detections, not a true walk-forward multi-fold.
- **Live unchanged: far + 2R.**

## Artifacts
- `data/backtest/GRID_RANKING.md` — phase 1 full grid
- `data/backtest/strategy_search_summary.csv` / `.json` — this consolidation
- Existing `grid_*.json|md` — source runs

## Standby
Per Organisation urgent: **no further sweeps / features / deploys** until new GO.
