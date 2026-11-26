---
name: sc-operations-presentation
description: >-
  Generate a branded PowerPoint "Supply Chain Operations Review" for a customer using the
  Flowlity MCP connector — an executive deck covering inventory health, cash at risk,
  availability/supply risk, new products and forecast quality, with every figure pulled live
  from Flowlity. ALWAYS use this skill whenever someone asks to create, build, refresh or
  generate a supply-chain operations deck/presentation/review/report, an "ops review", an
  inventory or stock status deck, a "Flowlity presentation", or a management/SteerCo-style
  supply-chain status slide set — even if they don't say the word "skill". Do NOT hand-build
  such a deck from memory; follow this workflow so the branding, split logic, current-stock
  field, product links and slide structure are applied consistently.
---

# SC Operations Review

Builds a 6-slide, executive-summary-first PPTX from live Flowlity MCP data, branded with the
**customer's own** identity (logo + colours), not Flowlity's.

The deck is produced by two scripts that you drive with a single config file:
- `scripts/generate_assets.py` → dynamic cover background + brand wordmark lockups
- `scripts/build_deck.js` → renders the 6 slides from `deck_data.json`

A complete, working example config is in `assets/example_deck_data.json`. The full config
schema and the Flowlity tool→field mapping (with gotchas) are in
`references/flowlity-data.md` — **read it before gathering data.**

## Before you start
This skill is self-contained: the bundled `scripts/build_deck.js` already encapsulates all
pptxgenjs rendering, so no external base `pptx` skill is required. It needs two runtime
dependencies, installed once in the working dir from the public npm and PyPI registries, at the
versions the scripts are tested with:
- `npm install pptxgenjs@4.0.1`
- Pillow 13.0.0 for `generate_assets.py`. Skip this if `python3 -c "import PIL"` already works.
  Otherwise install it in a virtual environment, never into the system Python:
  `python3 -m venv .venv && .venv/bin/pip install Pillow==13.0.0`, then run the script with
  `.venv/bin/python` instead of `python3`.

(If a base `pptx` skill happens to be present in your environment you may consult its
`pptxgenjs.md` for extra QA tips — optional, not required.)

## Workflow

### 1. Identify the account
Call `list_sites` (Flowlity). Capture **every** accessible `site_id`, **company name**, currency.
If several sites exist you have two paths — build the deck for **one** site, or use **site as the
split dimension** across slides 2–5 — decided in Step 3, so don't force a single-site choice here.
Keep all `site_id`s and names; a multi-site (split-by-site) deck should share one currency, so flag
it if the sites differ. The connector's account context can change between calls — if a later call
returns "access denied" or a different company, re-run `list_sites` and tell the user which account
you are now on. The deck is built for whatever company the connector currently exposes.

### 2. Brand from the company (never from the user's email)
The company name from `list_sites` is the branding anchor (a Flowlity employee's email domain
would mis-brand the deck). Resolve it to a domain with `web_search`, then **confirm in one line**
("Branding from democompany.com — correct?") so the user can override ambiguous names.
Get the logo + palette, in order of preference:
1. The customer's real logo file, if present (downloaded from their domain in the runtime
   environment, or dropped into the working dir as `logo_white.png` / `logo_dark.png`).
2. Otherwise run `generate_assets.py`, which renders a faithful **wordmark** lockup + a dynamic
   cover background from `brand.accent` and `brand.ink`.
Note: in restricted sandboxes you often cannot fetch external image binaries (web_fetch refuses
image content; code egress is allow-listed). The wordmark fallback covers that case — do not
block on the logo. **Source `brand.accent` from the customer's own website** — their logo / site
CSS, or a brand-palette lookup (e.g. Brandfetch) — not a generic guess. If the exact hex can't be
extracted (site blocks fetch, CSS stripped), match the dominant brand colour from the site and say
so in one line. Default `brand.ink` to a near-black tint of the accent. **The cover must be dynamic
— never a flat black slide.** (e.g. if DemoCompany's brand is teal-blue, set accent `2F6FB0`; align the semantic "good" GREEN
to a complementary shade so the deck reads as one brand.)

### 3. Choose the split dimension(s)
Call `list_tags`. Decide how to segment slides 2–5.

**First, handle multiple sites.** If `list_sites` returned more than one site the user can access:
- **Multiple sites AND a populated ABC-class tag category** (verify ABC as below) → **ask the user
  which split they prefer for the deck: per site or per ABC.** Don't assume or default — present
  both options and let them choose.
- **Multiple sites and NO ABC** (category absent or empty) → **default to splitting by site** — no
  need to ask.
"Per site" means each accessible site is one segment band on slides 2–5; gather the per-site figures
by calling `get_site_kpis` (and the other tools) once **per `site_id`**. All other data rules are
unchanged. (If the user instead wants a single-site deck, treat it as the one-site case below.)

**If there is only one site (or the user picked one), choose a tag-based split:**
1. If an **ABC-class** tag category exists, prefer it — but **verify it is populated** by calling
   `get_site_kpis(site_id, tag_ids=[<class tag>])`. An empty ABC category returns "No KPI data".
   A **4-class ABCD** category (CAT_A/B/C/D) counts as ABC and is an excellent primary split —
   when it's populated you can use it without asking the user.
2. If ABC is absent or empty, find the tag category with **3–4 distinct, populated tags** and
   **ask the user** to confirm using it (or pick another). The user may choose **more than one**
   dimension (e.g. Brand + an ERP lifecycle status) — slide 3 has two split panels for exactly this.
Verify a candidate is populated the same way (a `get_site_kpis` tag filter returning data).

### 4. Gather the data
Pull per the tool→field map in `references/flowlity-data.md`. Critical rules:
- **Current stock = `get_stock_levels(..., include_storage_breakdown=true)` → "Total Quantity".**
  Do NOT use the plain `get_stock_levels` / `get_stock_coverage` / `get_product_detail` "Stock
  Qty / Stock Level" for current stock — that is a **net/available position** and goes negative.
- **Stock coverage (days)** comes from `get_stock_coverage`.
- **New products are optional, not required.** Slide 6 no longer carries a new-introductions card.
  If you do want a new-product read, it = items with **< 6 months of demand history**
  (`get_monthly_demand_forecast`); an ERP "new/pre-launch" status is a valid proxy. Many sites have
  **no lifecycle flag at all** (e.g. a pure distributor) — then say so and skip it rather than inventing one.
- **No End-of-Life analysis.** Flowlity exposes no EOL/discontinued field — never invent one.
  "Cash at risk" uses the validated above-max overstock (below) and, where a real phase-out status
  exists, its stock value — labelled phase-out, not EOL. Do not equate an ABC "D" class with EOL.
- Capture each named product's `product_site_id` so it can be linked (see rule below). Alert rows
  carry a product **code**, not the id — resolve it with `list_products(search="<code or name>")`
  and pick the **exact** code (substring matches return cartons/variants).
- **Overstock detection (use "above max", NOT a firm-demand cover ratio).**
  - Signal: an item is overstocked when projected **Stock > Max**. Get both from
    `get_product_planning(product_site_id, site_id, start_date, end_date)` — a daily series with a
    `Stock` and a `Max` column. **The dynamic buffer `Max` is populated here even when
    `get_product_constraints` returns it blank**, so this is the place to read the ceiling.
  - `list_product_alerts(site_id, criticality=1)` is the same "above max" alert and works as a coarse
    candidate filter, **but its "Excess Value" is a forward-projected figure that routinely exceeds
    the item's current stock value and even fires on currently-under-stocked SKUs** — never sum it,
    rank on it, or present it as € cash.
  - **Validate over the next ~6 months:** keep an item only if its projected stock stays **above Max
    for a sustained stretch** (genuine over-cover). Items that drop back under Max quickly, or that
    also carry stockout (criticality 2) windows, are phasing / lot-size issues — not destockable.
  - **Two buckets, because dynamic Max is often set very wide** (long lead times + MOQ inflate the
    ceiling, so a lot of dead stock can sit *below* Max and never trip the alert). Report both:
    1. **Above Max — act now:** projected Stock > Max, sustained over the coming months. Split by
       firm-PO status (below) into cancel/defer-PO vs destock. Excess € = (Stock − Max) × unit price.
    2. **Slow stock below a wide Max — review buffer:** Stock ≤ Max **but** at real demand the item
       won't be consumed within ~12 months (cover > 12 mo, or near-zero demand). These are genuine
       tied-up cash that the alert misses because the ceiling is too generous — the action is to
       *tighten the Max/coverage parameter first*, then destock. Value them at current stock €.
  - Always add a one-line note on the slide defining these two buckets (the "below a wide Max" label
    is not self-explanatory) — state the ~12-month threshold explicitly.
  - **NEVER compute cover as `stock ÷ Firm Demand (30d)`.** Firm 30-day demand is just the
    confirmed-order pipeline (often ≈0) and massively overstates cover — e.g. a slow SKU can read
    as 72 months on firm demand but ~6 months on real demand, so it would be wrongly flagged. If you need
    a cover figure, use **trailing-average actual demand** from `get_monthly_demand_forecast`.
- **PO check — use order status, NOT "Next Delivery".** Whether an over-covered item has supply to
  cancel comes from `list_orders(site_id, product_site_id)` **Status**: **status 3 = firm / open PO**
  (there is a real order to cancel or defer); **status 1 = planned / proposed** (a Flowlity
  recommendation — nothing placed, nothing to cancel). The **"Next Delivery" field in
  `list_products` / `get_product_detail` is NOT a reliable PO signal** — it shows the next supply
  event including planned status-1 lines, so using it over-labels items "cancel PO".
- **Action split for the cash slide:** over-covered **+ firm PO (status 3)** → *cancel / defer the
  order* (stop it landing); over-covered **+ no firm PO** → *destock* (promotion / write-off).
- **Working capital (cash slide) = months of stock on hand**, derived with no extra calls as
  `stock value ÷ monthly demand-value run-rate`, site-wide and per segment from `get_site_kpis`.
  Lead with it where a segment is genuinely frozen; otherwise let the validated above-max overstock
  (with the PO/destock split) carry the cash story.
- **Stock-health / working-capital split (slide 6, left panel):** decompose total stock value into
  **Healthy vs over-max excess** — sum the **current stock value of genuinely above-max items**
  (validated as above), split into firm-PO (cancel/defer) vs no-PO (destock). Do **not** use the
  alert "Excess Value" as €, and do **not** attempt a fixed min/max split from
  `get_product_constraints` (blank on dynamic-buffer sites — read `Max` from `get_product_planning`).
  At-risk SKUs typically hold ≈0 physical stock, so that exposure is **service risk, not capital** —
  keep it as an annotation, not a value band.
- **Trend over time (slide 6, bottom panel) — now live, single combined chart.** A 12-month trend
  is the highest-value addition for a recurring review, and `get_kpi_trends(site_id, kpi,
  start_date, end_date)` now works (the old date bug is fixed). **`kpi` is a strict enum.** Confirmed
  values:
  - **`inventory_level`** → use the **Value** column for **stock value in €** (properly priced;
    reconciles to the `get_site_kpis` total). This is the correct stock-value series.
  - **`zero_stock_days`** → service / stock-out-risk line (Value column is 0 — it's a days metric).
  - **`stock_coverage`** → a coverage index; **its "Value" column just echoes "Quantity"** (not a
    real € figure) and does **not** reconcile to total stock value — do **not** label it as € stock value.
  - **Demand-in-value:** no working enum found — `demand`, `past_demand`, `future_demand`,
    `actual_demand`, etc. are all rejected. Confirm the exact token with the Flowlity team before
    adding a demand line; don't guess.
  The panel renders **one combined line chart** from `trend.series` (all series share one value
  axis, so keep them in the same unit — e.g. stock value € and demand value € both in €M). If
  `trend` is absent it falls back to the "Pending platform fix" placeholder, so a site/enum that
  returns nothing degrades gracefully. Never fabricate the series.

### 5. Build
Write `deck_data.json` (schema in the reference; copy `${CLAUDE_PLUGIN_ROOT}/skills/sc-operations-presentation/assets/example_deck_data.json` and
replace values). Then, in the working dir:
```
python3 "${CLAUDE_PLUGIN_ROOT}/skills/sc-operations-presentation/scripts/generate_assets.py" --config deck_data.json --out .
NODE_PATH="$PWD/node_modules" node "${CLAUDE_PLUGIN_ROOT}/skills/sc-operations-presentation/scripts/build_deck.js" deck_data.json "./<Company>_SC_Operations_Review.pptx"
```
`NODE_PATH` is what lets the bundled script find the `pptxgenjs` installed in the working dir:
Node looks for modules next to the script, not in the current directory. (Leave it out only if
`pptxgenjs` is installed globally and already resolvable.)
Then save the finished `<Company>_SC_Operations_Review.pptx` to the user's outputs folder and
present it. (Build in the working dir first, as some environments restrict direct writes to the
outputs folder.)
```
```

### 6. QA
Convert to images and inspect every slide for overflow/overlap; confirm hyperlinks resolve to
`https://app.flowlity.com/planning/products/planning/products/<id>`. Fix and re-render once.
```
soffice --headless --convert-to pdf <deck>.pptx ; pdftoppm -jpeg -r 130 <deck>.pdf slide
```

## Non-negotiable rules (baked in from review feedback)
1. **Current stock** uses the storage-breakdown total, never the net "Stock Qty" field.
2. Table columns are labelled **"Current stock"** and **"Stock coverage"**.
3. **Every named product is a hyperlink** to `brand.linkBase + product_site_id`
   (`https://app.flowlity.com/planning/products/planning/products/{id}`).
4. **No order-alerts drill-down** — it isn't meaningful. The availability slide shows *where the
   risk sits* (zero-stock risk by segment) + the most-exposed SKUs (low physical stock + cover).
5. **Overstock = "above max", validated forward — never a firm-demand cover ratio.** Identify
   over-cover from projected `Stock > Max` (`get_product_planning`), kept only if it persists over
   the next ~6 months. Never use `stock ÷ Firm Demand (30d)` (firm 30-day demand ≈ confirmed
   pipeline, wildly overstates cover); never sum or rank on the criticality-1 alert "Excess Value".
   Report TWO buckets — **Above Max** (act now) and **Slow stock below a wide Max** (Stock ≤ Max but
   >12-month cover; the ceiling is set too wide) — and add a slide note defining both with the
   ~12-month threshold.
6. **PO status decides the action, not "Next Delivery".** Firm/open PO = `list_orders` **status 3**
   (cancel/defer); **status 1** = planned/proposed (nothing to cancel). The "Next Delivery" field
   includes planned orders, so it must not be used to label "cancel PO".
7. **Slide 6 = stock-health split + forecast accuracy + trend.** No "next steps"/new-introductions
   card. Stock-health split = three value buckets (Within Max / Slow below a wide Max / Above Max),
   each labelled with **both € value and SKU count** (see rule 9); never a min/max split on
   dynamic-buffer sites (read `Max` from `get_product_planning`). Forecast accuracy = **median
   3-month MAPE by ABC class** (A/B/C) from a sample of SKUs per class — use the **median, never the
   mean** (percentage MAPE on intermittent demand explodes; the median is robust), and caption it as
   sampled. Trend is **half-width, stock value only** (no derived demand line).
8. **No EOL** bucket; brand from the **company**, not the user's email; cover is **dynamic**. The
   slide-6 trend is **live** via `get_kpi_trends` — stock value = **`inventory_level`** (Value
   column), risk = `zero_stock_days`; `stock_coverage` is NOT a € value (its Value echoes Quantity).
   **There is no site-level demand-value (or demand-unit) trend enum** — do not derive demand from
   `stock ÷ coverage`; leave the trend as stock value only. Never fabricate; placeholder if empty.
9. **Every value/inventory split shows the SKU count beside the € value** (small / in brackets) — the
   ops audience wants both, as on the ABCD panels. Use the real classification count
   (`list_product_alerts criticality=1` count = SKUs flagged above Max; tag counts for ABCD). Where a
   bucket is a validated floor or has no system flag, label the count honestly ("N flagged",
   "examples") instead of implying completeness, and reconcile count-vs-quantified-€ in the note
   (e.g. a few hundred SKUs may be flagged above Max while only a small € figure is quantified on the
   largest — the alert's projected excess € over-states and isn't summed).
10. **Multi-site split rule.** With **multiple accessible sites + a populated ABC** category, **ask
    the user** whether to split slides 2–5 **per site or per ABC** — never assume. With **multiple
    sites and no ABC**, **default to splitting by site** (no question). With one site, fall back to
    the tag-based split (rule via Step 3). "Per site" = one segment band per `site_id`, figures
    gathered per site.

## Slide structure
1. **Cover** — dynamic brand background + wordmark/logo, title, period.
2. **Executive summary** — 4 KPI cards, a health banner, 3 decisions.
3. **Where the inventory sits** — stock value by the chosen split dimension(s). A strong second
   panel is a **Top-N SKUs-by-value table** (`inv.topSkus`: qty, stock €, days of cover via
   `get_stock_coverage`, names linked) — more useful than a redundant SKU-count chart; flag high
   cover in amber and show dead stock (no demand) as ">3,650 d".
4. **Cash & working capital at risk** — working-capital read (months of stock on hand by
   segment) + the overstock destocking shortlist (linked). See the working-capital rule below.
5. **Availability & supply risk** — health KPIs + zero-stock risk by segment + most-exposed
   SKUs (current stock + coverage, linked).
6. **Stock health & forecast quality** — three-bucket working-capital split (Within Max / Slow
   below a wide Max / Above Max), each with € **and SKU count**; median 3-month MAPE by ABC class;
   and a half-width live "stock value, last 12 months" trend (`inventory_level`), with a note panel
   beside it and a footnote defining the two overstock buckets. Placeholder fallback if trend empty.

See `references/flowlity-data.md` for the config schema and tool reference.
