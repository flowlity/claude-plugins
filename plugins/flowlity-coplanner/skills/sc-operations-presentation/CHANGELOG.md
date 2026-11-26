# sc-operations-presentation — update changelog

Changes from the previous version (derived from live customer build sessions; all examples below use placeholder data).

## scripts/build_deck.js
- **Slide 6 rebuilt** from "New products, forecast quality & next steps" to
  **"Stock health & forecast quality"**:
  - Left card: working-capital split — total stock value as a stacked bar of
    Healthy vs Excess, with a legend and a note.
  - Right card: MAPE by segment (unchanged logic).
  - Bottom panel: "Direction of travel" trend **placeholder** — empty axis frame +
    amber "Pending platform fix" pill + rich-text explanation. No fabricated data.
  - Removed the Next-steps panel (duplicated the exec-summary decisions) and the
    new-introductions card.
- Slides 1–5 unchanged. generate_assets.py unchanged (included for completeness).

## SKILL.md
- Split dimension: a 4-class **ABCD** category counts as ABC; use it without asking
  when populated.
- Data rules:
  - Overstock alerts are **not value-sorted** and recur across windows — **paginate
    all** criticality-1 rows (limit 200–300) and **aggregate by product** for the
    shortlist and the **total flagged overstock €**.
  - **Stock-health split** = Healthy (total − summed overstock) vs Excess (summed
    overstock). Do **not** use a min/max three-band split on dynamic-buffer sites
    (min/max come back blank). At-risk SKUs hold ≈0 stock → annotation, not a band.
  - New-product detection is now optional (many sites have no lifecycle flag).
  - Trend: render the placeholder; never fabricate (get_kpi_trends server-side bug).
- Non-negotiable rules and the slide-6 structure entry updated to match.

## references/flowlity-data.md
- Tool map: overstock row (pagination + aggregation), new "total flagged overstock €"
  row, new "stock-health split" row.
- Gotchas: unsorted/multi-window alert list; dynamic buffers ⇒ blank min/max.
- `newForecast` schema rewritten: `stockTitle/stockSub/stockSegments/stockNote`,
  `mapeTitle/mapeScale/mape/mapeNote`, `trendTitle/trendTag/trendFrameLabel/trendBody`.
  Removed `newTitle/newStat/newNote/stepsTitle/steps`.

## assets/example_deck_data.json
- Slide-6 (`newForecast`) block converted to the new schema using the placeholder DemoCompany
  example's own numbers (phase-out framed as the "excess" segment).

---

## Update 2 — live trend (get_kpi_trends now works)

- **scripts/build_deck.js:** slide-6 bottom panel now renders **two real line charts** when a
  `newForecast.trend` object is supplied (stock-coverage € + zero-stock-risk days), and falls back
  to the "Pending platform fix" placeholder when it's absent.
- **SKILL.md / references/flowlity-data.md:** trend is no longer "blocked". `get_kpi_trends`
  works; `kpi` is a strict enum — confirmed values **`stock_coverage`** (EUR series) and
  **`zero_stock_days`**. Other names (`stock_value`, `demand`, `mape`, …) are rejected; get the
  full enum list from the Flowlity team. `stock_coverage` is a coverage index, not absolute total
  stock value — label accordingly.
- **assets/example_deck_data.json:** added a `trend` block so the example renders the real charts
  (placeholder fields retained as the documented fallback).

---

## Update 3 — correct trend metric + single combined chart

- **Correction:** the previous note used `stock_coverage` as "stock value" — that was wrong. Its
  get_kpi_trends "Value" column merely echoes "Quantity" and does NOT reconcile to total stock
  value. The correct enum for stock value in € is **`inventory_level`** (its Value column is
  properly priced and matches the site total).
- **scripts/build_deck.js:** slide-6 trend is now **one combined line chart** (multiple series on a
  shared value axis) instead of two side-by-side charts. Schema:
  `trend:{ title, note, labels, yfmt, ymin, ymax, series:[{name,color,values}] }`.
- **SKILL.md / references:** enum guidance corrected — `inventory_level` (stock value €),
  `zero_stock_days` (risk); avoid `stock_coverage` for €; **demand-in-value has no confirmed enum**
  (`demand`, `past_demand`, `future_demand`, … all rejected) — confirm with Flowlity before adding.
- **assets/example_deck_data.json:** trend block updated to the combined-chart schema.

---

## Update 4 — overstock method corrected (above-max + firm order status)

Two corrections after live review caught false positives (e.g. a slow SKU wrongly flagged):

- **PO check must use order STATUS, not "Next Delivery".** `list_orders` Status 3 = firm/open PO
  (cancel/defer); Status 1 = planned/proposed (nothing to cancel). The "Next Delivery" field in
  `list_products`/`get_product_detail` includes planned status-1 orders, so it over-labels "cancel PO".
- **Overstock = "above max", not a firm-demand cover ratio.** Identify over-cover from projected
  `Stock > Max` in `get_product_planning` (the dynamic `Max` is populated there even when
  `get_product_constraints` is blank), validated as sustained over the next ~6 months. Never use
  `stock ÷ Firm Demand (30d)` (confirmed pipeline ≈0 → wildly overstates cover, e.g. a slow SKU
  72 mo vs ~6 mo real); if a cover figure is needed use trailing-average demand from
  `get_monthly_demand_forecast`. Never sum/rank the criticality-1 alert "Excess Value" (forward-
  projected; exceeds current stock value; fires on under-stocked SKUs) — use the alert only as a
  coarse candidate filter.
- **Stock-health split excess** = current stock value of validated above-max items, split firm-PO
  (cancel/defer) vs no-PO (destock) — not the alert € and not a min/max split.
- SKILL.md (data rules + non-negotiables) and references/flowlity-data.md (tool map + gotchas)
  updated accordingly. Note: the bundled example_deck_data.json still shows illustrative overstock
  figures; regenerate from live data using the corrected method.

---

## Update 5 — two overstock buckets, brand colours from the website, slide note

- **Overstock now reported as two buckets**, because Flowlity's dynamic `Max` is often set very wide
  (long lead times + MOQ), so dead stock can sit *below* Max and never trip the alert:
  1. **Above Max — act now** (projected Stock > Max, sustained; split cancel-PO vs destock).
  2. **Slow stock below a wide Max — review buffer** (Stock ≤ Max but >12-month cover / ~0 demand;
     tighten the buffer parameter first, then destock).
  A slide note must define both buckets and state the ~12-month threshold (the "below a wide Max"
  label isn't self-explanatory).
- **Brand colours are sourced from the customer's own website** (logo / site CSS / brand-palette
  lookup), not guessed; if the exact hex can't be extracted, match the dominant brand colour and say
  so. Align the semantic "good" green to the brand accent so the deck reads as one identity.
  (Worked example: a placeholder DemoCompany = teal-blue `2F6FB0`.)
- SKILL.md (branding section, overstock detection, non-negotiable rule 5) updated accordingly.

---

## Update 6 — SKU counts on value splits; ABC-class forecast accuracy

- **Every value/inventory split now shows the SKU count beside the € value** (small / in brackets),
  matching the ABCD panels. For the working-capital split, above-Max uses the real flag count from
  `list_product_alerts(criticality=1)` (e.g. a few hundred SKUs flagged above Max) — reconciled in the
  note against the small € figure quantified on the largest items (the alert's projected excess € over-states
  and isn't summed). Buckets that are floors/unflagged are labelled honestly ("examples").
- **Forecast accuracy is now median 3-month MAPE by ABC class** (A/B/C) from a per-class sample —
  median, not mean (robust to lumpy outliers), captioned as sampled. (Replaces the earlier
  aggregate steady-vs-lumpy KPIs.)
- **Trend is half-width, stock value only.** Confirmed there is no site-level demand-value/-unit
  trend enum, so the demand line is not derived from `stock ÷ coverage`.
- SKILL.md rules 7–9 + slide-6 structure updated; build script synced.

---

## Update 7 — Top-5-SKUs-by-value table on slide 3

- Replaced the redundant "SKUs by ABCD class" count chart with a **Top-N SKUs-by-value table**
  (`inv.topSkus`): product (linked to Flowlity), qty, stock €, and **days of cover** from
  `get_stock_coverage` (Avg Forecast → Coverage days). High cover flagged amber; dead stock
  (≈0 demand) shown as ">3,650 d". The €-value-by-class bar panel stays as the left panel.
- Rationale: value-by-class and count-by-class are the same distribution twice; the top-value
  table adds a per-SKU, actionable read (which big-ticket items are over-covered or dead).
- `splitB` (count chart) retained as a fallback if `topSkus` is absent.

---

## Update 8 — confidentiality scrub (no real customer data in the skill)

- Removed all real customer references from the skill. The example config
  (`assets/example_deck_data.json`) is now a fully fictional **DemoCompany** (placeholder products
  "Product Alpha/Bravo/…", round illustrative KPIs, neutral blue brand `2F6FB0`), refreshed to the
  current schema (topSkus table, ABC-class accuracy, three-bucket split with counts, classNote,
  half-width trend).
- Scrubbed real names/products/KPIs/domains/IDs from `SKILL.md`, `references/flowlity-data.md`, the
  changelog, and reset the build script's default semantic GREEN to a neutral `2E9E5B`. All worked
  examples now use placeholders (e.g. "DemoCompany", "a slow SKU", "a few hundred SKUs").
- Rule: customer names, product names, KPIs, site IDs and brand hexes are confidential and must
  never appear in the skill — only in the generated customer deck.

---

## Update 9 — the build runs again; pinned dependencies

- **scripts/build_deck.js:** fixed a syntax error in the slide-6 legend line (unbalanced
  parentheses around the `pct` / `count` suffixes) that stopped the script before it wrote
  anything. The legend reads `value  (pct)   ·  count`, each part only when present.
- **SKILL.md:** dependencies pinned to the tested versions (`pptxgenjs@4.0.1`, `Pillow==13.0.0`);
  Pillow goes into a virtual environment instead of `pip install --break-system-packages`; the
  build runs `build_deck.js` with `NODE_PATH="$PWD/node_modules"`, because Node resolves
  `require("pptxgenjs")` from the script's own folder, not from the working dir.
- Checked by building `assets/example_deck_data.json` into a 6-slide deck with those versions.
