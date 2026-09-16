# OB Retest Multi — TradingView

Indicateur **Pine Script v6** multi-symboles / multi-timeframes. Il ne déclenche une alerte **que sur retest** d’un Order Block frais (premier toucher de zone), **pas** à la création d’un OB.

Scan only — pas un conseil financier.

## 1. Installation

1. Ouvrir **n’importe quel** graphique TradingView (le timeframe du chart importe peu : les TF sont demandés via `request.security`).
2. Pine Editor → coller le contenu de `OB_Retest_Multi.pine` → **Save** → **Add to chart**.
3. L’indicateur s’appelle **OB Retest Multi** (pane, `overlay=false`) avec un tableau des derniers retests.

## 2. Tickers exacts (important)

Dans les settings **Symbols**, régler chaque symbole sur le **ticker exact** de la recherche TV pour **votre broker**.

Le préfixe compte, exemples :

- Or : `OANDA:XAUUSD` / `FX_IDC:XAUUSD` / `TVC:GOLD` selon le flux
- Nasdaq : `NAS100`, `NAS100USD`, `USTEC`, etc.
- S&P 500 cash : `US500`, `SPX`, `SPX500` — à corriger selon le broker
- Crypto / FX : `BTCUSD`, `EURUSD`, `GBPUSD` avec le bon exchange

Si le ticker est faux, `request.security` renvoie des données vides ou un autre marché → pas d’alerte utile.

Chaque symbole et chaque TF a un toggle **On** (tous actifs par défaut).

## 3. Créer UNE alerte

1. Horloge **Alert** sur le chart où l’indicateur est chargé.
2. **Condition** = `OB Retest Multi`
3. Choisir :
   - **Tout appel de la fonction alerte()** (`Any alert() function call`) — message détaillé `Retest Bull/Bear SYM TF N* mid=...`
   - **ou** `Any retest` (alertcondition)
4. Fréquence : **Once Per Bar Close** / Une fois par barre à la clôture.
5. Une seule alerte suffit pour toute la watchlist (6 symboles × 6 TF).

## 4. Timeframes surveillés

Fixes (chacun activable) : `5`, `15`, `30`, `60`, `240`, `D`.

## 5. Logique

- Détection displacement + bougie OB opposée + score 0–5* (FVG, BOS, Sweep, Fresh, PD), aligné sur `OB_5Star_Scanner`.
- Seuls les OB avec stars ≥ **Min stars** (défaut 4) sont suivis.
- **Retest only** : premier toucher `low<=hi` et `high>=lo` après la barre de displacement, tant que fresh / non mitigé.
- Mitigation : close au-delà du mid 50 % (comme le scanner mono-symbole).
- **Aucune** alerte à la création d’un OB.
- Message d’alerte append `SL=… TP=…` (entry = mid, SL beyond zone + buffer, TP = 1.5R).

## 6. Notes / limites

- 36 appels `request.security` (6×6). Désactiver des symboles/TF réduit le bruit d’alerte mais les appels restent évalués.
- Les `var` à l’intérieur de `f_retestSignal` sont **par contexte** security (un état OB par symbole × TF).
- Données TV peuvent différer du scanner local Coinbase/Yahoo.
