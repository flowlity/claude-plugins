---
name: forecast-audit
description: >
  Produces a short, prioritized list of demand- and forecast-quality problems for
  a Flowlity customer's item base, each with a concrete forecast-input or
  parameter fix and a value- or volume-based impact so the worst rank first. Use
  whenever someone asks to run a forecast audit, audit demand or forecast quality,
  find SKUs the model forecasts badly, surface forecast actions and insights,
  check forecast accuracy / MAE / bias / FVA, or flag a sharp demand drop /
  stock-out-distorted history, new products with no similar product link,
  persistent forecast bias, low-accuracy SKUs. Also triggers on "forecast quality agent", "where is the
  model wrong and why", "demand audit", or "forecast health check". This is the
  DEMAND-side counterpart to data-quality-audit (which is supply/master-data
  oriented) — use it whenever the subject is forecasts, demand history, accuracy,
  or bias. Always use this skill — do NOT improvise a forecast
  audit; the checks, scoring, and output format are specific.
---

# forecast-audit

Generates a **short, prioritized list of demand- and forecast-quality problems**
for a customer's item base, each with a concrete fix to the forecast *input* or
*parameter* — never an operational action.

This answers a request demand planners make repeatedly: a proactive agent that
hands them a weekly shortlist of *"SKUs where the forecast is wrong, and the
specific reason why"* instead of forcing them to inspect thousands of items by
hand. The framing is usually some version of *"show me where the model is wrong
and what I should fix so it gets better."*

Run it against the customer's real data through the **Flowlity MCP server** so
their own problem items surface automatically.

This is the **demand-side sibling of `data-quality-audit`**. That skill audits
whether an item can be *replenished* correctly (suppliers, lead times, prices);
this one audits whether an item is *forecast* correctly (history quality,
similar products, bias). If a request is about supply/master data,
use `data-quality-audit`; if it is about forecasts/demand, use this one.

---

## Design principles

The shortlist is only useful if it respects these principles (inherited from
`data-quality-audit`, adapted to the forecast domain):

- **Short, not exhaustive.** Target **~10 items** per run. Rank hardest-hitting
  first and cut the tail. A weekly user works the list top-down and stops when
  out of time.
- **Every flag is a FORECAST-INPUT or PARAMETER issue, and every fix corrects an
  INPUT or PARAMETER**, not operations. This is the core rule. Each item flagged
  is a defect in what the model *learns from* or *is told* — a distorted or
  dropped history, a missing similar product link/attribute, a
  wrong base — and the suggested fix is always to **correct that input or
  setting** (clean or re-base the history, link a similar product, populate an
  attribute). The shortlist must **never**
  recommend an operational action such as "place an order", "build stock", or
  "expedite", and must never tell the planner to **hand-type a new number** as
  the fix. When a symptom looks operational ("we'll stock out because the
  forecast is too low"), name the **underlying forecast defect** that causes it
  ("demand dropped sharply below baseline and the model re-based too low") and fix that.
- **Every item needs a concrete forecast fix**, not just a flag. The planner
  should be able to accept/reject a single, specific correction.
- **Explain *why*** each item is flagged, in one plain sentence, framed as the
  forecast defect.
- **Ranking by impact is essential.** The biggest problems must sit at the top.
  Never present flags unranked, and never let a cosmetic issue outrank a large,
  badly-forecast, high-volume SKU.
- It is acceptable and expected to recommend **flagging history for OOS
  cleaning** or **re-basing a shifted level** (input changes) — these are
  concrete forecast corrections, not operational actions.

---

## Why candidate selection comes first (read before running)

Every forecast diagnostic tool below is **per-product** — `get_demand_summary`,
`get_forecast_accuracy`, `get_monthly_demand_forecast`, and `get_forecast_history`
each take a single `product_site_id`. There is **no batch forecast pull**.
Running them across a 1,000+ SKU base is neither affordable nor necessary, so the
skill **must scope to a candidate pool first**, then diagnose only that pool. A
forecast error on a tail SKU rarely belongs on a top-10 list anyway.

Build the candidate pool (one cheap bulk call + a couple of filters) as:

1. **High-contribution SKUs** — `list_products` with demand KPIs; rank by demand
   **volume** (and **value** if prices exist) and take enough SKUs to cover the
   bulk of demand (e.g. the top ~50–150, or roughly the items making up ~80% of
   volume). These are where a forecast error costs the most.
2. **Recently launched SKUs** — items with **< ~6 months of history** (for Check
   2). New products are the highest-risk forecasts and small in number.
3. **Already-alerted SKUs** — anything Flowlity is already flagging
   (`list_product_alerts` / `get_product_detail`), since an alert often traces
   back to a forecast defect.

De-duplicate the union; that is the pool you run per-product diagnostics on.
State the pool size in the output summary ("scanned N of M SKUs, selected as the
top contributors + recent launches + alerted items").

---

## Inputs required

Confirm you have access to, or ask the user for:

1. **Item list + demand KPIs + attributes** — per item: demand volume/value, ABC
   tag, active status, first-sale / age, and the categorical attributes the
   similarity engine uses (category, licence/IP, channel, similar product
   link). From `list_products`, `list_tags`, and `get_product_detail`.
2. **Demand history & forecast, monthly** — `get_monthly_demand_forecast` over a
   trailing window (and the same months in prior years for cross-year checks)
   returns, per calendar month, **Actual Demand**, **Final Forecast**, and
   **Flowlity Forecast** (the ML baseline). This drives the bias check because it
   exposes actual vs forecast side by side. Note the Final − Flowlity gap is
   **not** decomposed — it blends firm/confirmed demand with any manual
   adjustment, so do not read it as a clean manual-override signal (see
   "Removed check" below).
3. **Accuracy windows** — `get_forecast_accuracy` returns **MAPE / MAE / FVA**
   per product. Use **MAE** (absolute error, in units) to size and screen
   accuracy. FVA is reported for context but is **not** a reliable
   override-quality signal across customers (it is contaminated by firm demand
   the ML baseline cannot see), so do not draw override conclusions from it.
4. **Forecast revision history** — `get_forecast_history` shows how the forecast
   for a given target month evolved across runs (latest run at the bottom of each
   target-month block; same-month runs are excluded). Use it to confirm a
   *persistent* bias (same-signed error run after run) versus a one-off miss.
5. **Price (optional)** — unit / valuation price from `list_products` (*Stock
   Value* ÷ *Stock Qty*) or `get_product_constraints`, used to express impact in
   value. **Often absent for Demand-only customers** — see Scoring for the
   volume fallback.
6. **Last Demand review date (for the suppression rule)** — a per-product date
   recording when a planner last reviewed the SKU's demand/forecast. Treat this as
   a **dedicated MCP field** (planned addition; expected on `get_product_detail`
   and/or `get_demand_summary`) — **not** the free-text `get_comments` stream,
   which is too sparse and unreliable to drive suppression. If the field is not
   yet exposed, the suppression rule does not fire; say so in the run summary
   rather than assuming no reviews have happened.
7. **Planner comments (for enrichment)** — `get_comments` for a `product_site_id`
   returns the free-text planner notes on that product. These are **not** used to
   suppress flags (see point 6), but **are** pulled for every flagged SKU to add
   context to its row — see "Enrichment: planner comments" under Forecast checks.

Pull these from the **Flowlity MCP server** directly. If the connector is
unavailable, the fallback is the customer's sales-history / forecast export.

---

## Forecast checks

Run every check below across the **candidate pool**. Each produces candidate
flags and defines its **own impact metric** (see Scoring). Each heading IS the
forecast-defect category — use that exact name in the output so the planner sees
a forecast input/parameter to fix, never an operational task.

### Suppression: recently-reviewed SKUs (applies to ALL checks)

Before a candidate flag from any check makes the shortlist, check the SKU's
**last Demand review date** (the dedicated field described in Inputs). If it falls
**within the last 4 weeks**, a planner has recently reviewed this SKU's
demand/forecast. The logic:

- **If the last Demand review date is within the last 4 weeks → suppress the
  flag.** Assume the planner has already reviewed this forecast; do not surface it
  again. The point of the shortlist is to hand planners what they have *not* yet
  looked at.
- **Exception — fresh anomalies override the suppression.** If the anomaly the
  check detected **occurred within the last 4 weeks**, flag it right away
  regardless of any review (the review may predate the anomaly, and a fresh
  problem is worth raising even on a recently-touched SKU).
- So the suppression only removes flags whose anomaly is **older than 4 weeks**
  on SKUs reviewed within the last 4 weeks. Everything else flags normally.
- If the last-Demand-review-date field is not yet exposed by the MCP, this rule
  does not fire and every check behaves as usual — note that in the run summary
  rather than silently assuming "no reviews".

### Enrichment: planner comments (applies to ALL flagged SKUs)

Once a SKU has been flagged by any check **and survived suppression**, pull its
planner comments with `get_comments` for that `product_site_id` before writing the
row. The purpose is **enrichment, never suppression** — a comment must **not**
remove a flag from the shortlist or downgrade its impact. It only adds context and
explanation, so the planner reads the flag already knowing what (if anything) has
been said about it.

- **A comment never discards the alert.** Even a comment that appears to explain
  the anomaly away (e.g. "drop is a known delisting", "the over-forecast is
  expected, big promo coming") stays on the list — surface it *with* that context so the planner
  decides, rather than silencing it on the SKU's behalf. The flag is still the
  thing the planner accepts or rejects; the comment just informs that decision.
- **Use comments to sharpen the "why" and the fix.** A relevant recent comment
  can corroborate a cause (a stock-out note next to a Check 1 drop, a "new range
  replacing this one" note next to a Check 3 persistent over-forecast), narrow
  the suggested fix, or flag that the planner's stated intent diverges from what
  the data shows.
- **Weave the context into the row, briefly.** Fold the most relevant comment into
  the "Why it's flagged" sentence as a short attributed note (e.g. *"…sharp drop
  Feb–Apr; planner comment 12 Mar notes a supplier shortage, consistent with a
  crit-11 window."*). Paraphrase rather than dumping the full thread; prefer the
  most recent and most on-topic comment.
- **No comment, or only stale/irrelevant ones → say nothing extra** and write the
  row as the check produced it. Absence of a comment is not itself a finding.
- This is distinct from the suppression rule above: comments are deliberately
  **not** used to suppress (they are too sparse/unreliable for that, per Inputs),
  only to contextualise a flag that is already on the list.

### Check 1 — Demand drop (input issue) — a sharp recent fall below the established baseline
The defect: recent months contain a **sharp, sustained drop in actual demand
well below the SKU's established baseline** (and breaking from its prior-year
seasonal shape). The model trains on these depressed actuals and propagates the
lower level forward. This is typically the single biggest forecast problem for a
consumer-goods customer.

**Do not assume a cause.** The drop is the *flag*, not the diagnosis. A
below-baseline collapse can come from several causes that look identical in the
demand curve alone: a genuine demand decline or level shift, a delisting /
channel or customer loss, an availability constraint (stock-out), a data /
integration gap, or a one-off. Name it for what it is — a demand drop — and
**confirm the cause before choosing the fix.**
- `get_monthly_demand_forecast` / `get_demand_summary` → scan the actuals for a
  **sharp recent fall below the local baseline** (the surrounding healthy months
  and the prior-year same months). A trough followed by a sharp recovery is a
  strong stock-out-then-relaunch signature; a drop that stays low points more
  toward a genuine level shift.
- **Corroborate the cause before recommending a fix.** Check the auto-detected
  zero-stock / possible-shortage windows via `list_product_alerts`
  (**criticality 11 and 12** are the shortage alert types) for the dropped
  months — a matching shortage window confirms an availability cause; its absence
  (especially when the SKU is currently well-stocked) points to a real demand
  shift. Use `get_product_detail` for further availability context.
- *Suggested fix (pick per confirmed cause):* "Demand for <months> dropped sharply
  below the ~<baseline> baseline. If a shortage is confirmed (crit 11/12 window),
  flag those periods for cleaning so the model stops training on suppressed sales;
  if it is a genuine level shift, help the model re-base to the new level; if it
  is a data gap, fix the feed." Never assert a stock-out without the availability
  corroboration.
- **Impact:** estimated **demand gap** — the difference between the dropped
  months and a reasonable baseline (the surrounding healthy months or prior
  year), in value if priced.

### Check 2 — New product without similar product link (input issue) — nothing for the similarity engine to anchor on
The defect: a launch SKU with **< ~6 months of history** and **no similar
product link** (Flowlity's term for the look-alike/predecessor a new item borrows
its profile from) and/or **null categorical attributes** (category, licence/IP,
channel). With no history and nothing to borrow from, the similarity engine has
no anchor and the launch forecast is effectively a guess. Critical for platform
transitions (e.g. a v1→v2 hardware switch) and new IP.
- `list_products` → identify SKUs with short history / recent first sale (no
  MAPE and no firm demand is the quick screen).
- `get_forecast_accuracy` → the **authoritative signal, available even with no
  history**: `Has Similar Products: No` means there is no similar product link,
  and `Forecast Model: zero` confirms the model has nothing to forecast from.
- `get_product_detail` → secondary check on whether the categorical attributes
  the model uses are populated.
- **Flag** short-history SKUs with **`Has Similar Products: No` AND/OR missing
  key attributes**.
- *Suggested fix:* "New SKU with no history and no similar product link — link a
  comparable predecessor / populate <category|licence|channel> so the similarity
  engine has something to forecast from."
- **Impact:** **expected launch volume** (planner's launch plan, committed stock
  / first PO, the similar product's run-rate, or the category average), in value
  if priced.

### Check 3 — Persistent forecast bias (input/parameter issue) — SKU always over- or under-forecast
The defect: the forecast is **biased in one direction run after run** — actuals
systematically land above (under-forecast) or below (over-forecast) the forecast.
A persistent same-signed error points at a missing driver, not random noise.
- `get_monthly_demand_forecast` → per month, the **signed error** (Actual −
  Final Forecast) over the trailing window; a consistent sign = bias.
- `get_forecast_history` → confirm the bias holds **across forecast runs** for
  the same target months (not a one-off).
- **Flag** SKUs whose signed error keeps the **same direction** across most
  recent months/runs.
- *Suggested fix:* "Forecast is persistently <under|over> by ~<%> — correct the
  driver: fix the base/level (e.g. re-base to a shifted demand level), rather
  than nudging single months."
- **Impact:** **bias magnitude × volume** — average signed error × volume, in
  value if priced.

### Check 4 — Unexplained low accuracy (residual triage) — model is badly wrong with no identified cause
The defect: a **meaningful-volume SKU the model forecasts poorly (high MAE)** that
**none of Checks 1–3 explained** — not a demand drop, not a new product, not a
one-directional bias. The error is large and two-sided / noisy.
This is a deliberate **residual catch-all** so a genuinely badly-forecast big SKU
doesn't slip through just because it doesn't match a named pattern.

**This is the one check whose action is "investigate", not a specific input fix** —
by definition the cause is unidentified. Keep it **tightly bounded** so it doesn't
become a dumping ground.
- `list_products` → **MAPE 30d** is the only bulk accuracy signal; use it to
  shortlist candidates. Then `get_forecast_accuracy` → **MAE** (absolute error, in
  units) per product to confirm and to size the impact.
- **Only fire when Checks 1–3 came back empty for that SKU.** A named cause always
  wins — if any of 1–3 explains the error, use that check, not this one. Never
  double-flag the same SKU as both a named defect and "unexplained".
- **Require real volume and a real miss:** screen on **high MAE**, and only keep
  SKUs where **MAE × price** (or MAE × volume) is large. Do not flag low-volume
  noise — a high MAPE on a tail SKU is a small-denominator artifact, not a defect.
- *Suggested fix:* "Forecast persistently inaccurate (MAE ~<n> u) with no
  demand-drop / new-product / bias cause found — flag for planner
  review: check for a missing similar product link, a data-quality / granularity
  issue, or genuinely intermittent demand that may warrant a different model
  setting." Point at candidate **input/parameter** fixes; never an operational
  action or "type a number".
- **Impact:** **MAE × price** — the absolute per-period forecast error converted
  straight to value (MAE is already in units, so this is a direct EUR figure and is
  comparable to the other checks). Use MAE × volume if unpriced. State the MAE
  window used (e.g. 3-month).

---

## Removed check — Forecast-degrading override (do not re-add without a firm-demand split)

A "forecast-degrading override" check (manual final forecast beats the baseline
*down*, screened on negative FVA) was **deliberately removed**. It could not be
concluded reliably across customers:

- The MCP does **not** expose a clean manual-override ("My Forecast") layer. The
  only forward read is the **Final − Flowlity gap** in `get_monthly_demand_forecast`,
  and that gap **blends firm/confirmed demand with any manual adjustment** — on a
  firm-order-heavy customer a large gap is usually just the order book, not a bad
  override, so the check produces **false positives**.
- There is **no historical My Forecast (or historical Final) series** to validate
  "persistently worse": `get_monthly_demand_forecast` returns past Actuals only
  (Final/Flowlity are blank historically), `get_forecast_history` returns the ML
  baseline across runs (not the override), and `get_product_planning` is
  forward-only. The sole historical trace is the aggregate **FVA**, which is
  itself contaminated by firm demand.

If a reliable override signal becomes available later (a dedicated My-Forecast
field, or a firm-demand series to net out of the gap), the check can be
reinstated — netting firm demand out first and only flagging the residual.

---

**Ranking by impact is the point of this skill.** Each check defines its own
impact metric. Express every impact on a **single common basis** so flags are
comparable across checks:

- **If a unit/valuation price exists →** express impact in **monetary value**
  (impact quantity × price), same as `data-quality-audit`. **MAE × price is the
  cleanest such measure** — it is already an absolute error in units, converts
  directly to EUR, and (unlike MAPE) does not blow up on small-denominator tail
  SKUs; prefer it for the accuracy-weighting below wherever a per-product MAE is
  available.
- **If price is absent (e.g. a Demand-only customer) →** fall back to **demand
  volume** and **% of total site demand (contribution)**. Do **not** let
  value-based impacts silently collapse to ~0 — switch the whole ranking to
  volume so it stays meaningful.

Prefer an **accuracy-weighted impact** wherever the check supports it: a SKU that
is both **big** and **badly forecast** should outrank one that is merely big.
Checks 3 and 4 bake this in (error × volume / MAE × price); for 1 and 2, a
large SKU with a clear defect should rank above a small one.

| Check | Forecast-issue category | Impact basis |
|---|---|---|
| 1 | Demand drop | estimated demand gap vs baseline (value if priced) |
| 2 | New product without similar product link | expected launch volume (value if priced) |
| 3 | Persistent forecast bias | bias magnitude × volume (value if priced) |
| 4 | Unexplained low accuracy | MAE × price (MAE × volume if unpriced) |

Rank all flags by impact descending and **keep the top ~10**. If multiple checks
flag the same SKU, merge them into one entry listing every issue, ranked by its
highest single impact.

**Ensure a mix of checks where the data supports it.** Don't let one check fill
the whole list. Represent **as many of the four checks as genuinely fire** —
aim for at least 2–3 distinct checks, but never pad the list with weak or
manufactured flags just to hit a count (e.g. if a site has no recent launches,
Check 2 will correctly produce nothing). Check 4 is a **residual** — it should
fill the gaps left by 1–3, not crowd them out. If the top of the ranking is
concentrated in one check, substitute the highest-impact genuine items from
other checks, staying as close to impact order as otherwise possible.

---

## Output

Produce a single ranked shortlist — a table — with these columns:

| # | Item | Description | Forecast issue (category) | Why it's flagged (1 sentence) | Suggested fix | Impact | Flowlity links |
|---|---|---|---|---|---|---|---|

The **Forecast issue** column must use the check's category name (e.g.
"Demand drop", "New product without similar product link", "Persistent
forecast bias") — never an operational symptom. The **Suggested fix** column must
name the input or parameter to correct, never an operational action ("place an
order", "build stock") and never "type in a new number". Where a relevant planner
comment exists (see "Enrichment: planner comments"), fold it briefly into the
**Why it's flagged** cell as an attributed note — context for the planner, never a
reason the flag was dropped.

**Always include the Flowlity links column. This is the single most-often-forgotten
part — do not omit it.** Give **two** links per row — the **Planning** page and
the **Demand** page. Both require the numeric `product_site_id` (NOT the item code
or EAN); resolve it via `list_products(search="<code>")` or `get_product_detail`
if you only have the code, then build:

```
Planning: https://app.flowlity.com/planning/products/planning/products/<product_site_id>
Demand:   https://app.flowlity.com/demand/products/demand/products/<product_site_id>
```

e.g. product_site_id `94625222` →
`https://app.flowlity.com/planning/products/planning/products/94625222` and
`https://app.flowlity.com/demand/products/demand/products/94625222`. Render them
as clickable links in the markdown table (e.g. `[Planning](…) · [Demand](…)`).
The Demand page is usually the more relevant one for a forecast audit, since the
fixes are demand-side (history cleaning, similar product link, re-basing a level).

Keep it to **~10 rows**. Below the table, add a one-line summary: how many SKUs
were in scope vs in the candidate pool, how many flagged in total, and how many
shown (e.g. "scanned 1,388 SKUs → 120 in candidate pool → 28 flagged → top 10
shown").

Deliver as a markdown file saved to the user's outputs folder and also present the
table inline. Do **not** apply any changes automatically — this skill only
*recommends*. Each row is something the planner accepts or rejects.

---

## Pre-delivery checklist

Before returning the shortlist, verify row by row:

- [ ] Every row's "Forecast issue" is one of the 4 category names — not a symptom
      or an operational task.
- [ ] Every "Suggested fix" corrects an **input or parameter**, never "order /
      build / expedite" and never "type a new number".
- [ ] The **recently-reviewed suppression rule** has been applied: SKUs with a
      Demand review in the last 4 weeks are dropped unless their anomaly is itself
      within the last 4 weeks.
- [ ] Impact is on a **single consistent basis** (value if priced, else volume),
      and the list is sorted by it descending.
- [ ] A **mix of checks** is represented where the data supports it (no single
      check fills the list; no padding with weak flags).
- [ ] **Check 4 is residual:** any "Unexplained low accuracy" row genuinely had
      no cause from Checks 1–3, has real volume (not a small-denominator MAPE
      artifact), and no SKU is double-flagged as both a named defect and "unexplained".
- [ ] **Planner comments checked for every flagged SKU** via `get_comments`; any
      relevant comment is woven into "Why it's flagged" as context, and **no flag
      was dropped or downgraded because of a comment**.
- [ ] **Every row has both Flowlity links (Planning + Demand) built from the
      numeric `product_site_id`** — check this last, it is the most commonly missed.

---

## Demo notes

- Lead with the planner's own pain: they cannot inspect thousands of forecasts by
  hand, so the system hands them the few that are wrong and *why*.
- The strongest live moments are **Check 1** (a sharp demand drop the model
  re-bases on — strongest when corroborated as a stock-out via the crit-11/12
  shortage alerts) and **Check 2** (a launch SKU with no history and no similar
  product link, where `Forecast Model: zero` means the model has nothing to go
  on) — both are concrete, defensible, and show the inputs letting the model down.
- Frame it as Flowlity taking **shared responsibility for forecast quality** —
  surfacing the handful of SKUs where the inputs, not the planner's judgement, are
  letting the model down.
