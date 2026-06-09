# Flowlity data reference & config schema

## Tool → field map (per slide)

| Need | Tool | Field / note |
| --- | --- | --- |
| Headline KPIs (stock value, zero-stock risk, firm demand, firm orders, MAPE, alert counts) | `get_site_kpis(site_id)` | whole-site totals |
| Per-segment KPIs (stock value, ZSR, MAPE by class/brand/status) | `get_site_kpis(site_id, tag_ids=[tag])` | one call per segment; empty/unpopulated tag → "No KPI data" |
| Tag categories & values | `list_tags(site_id)` | used to pick the split dimension |
| Overstock candidates ("above max") | `get_product_planning(site_id, product_site_id, start, end)` | daily `Stock` vs `Max`; **Stock > Max = overstocked**. `Max` (dynamic buffer ceiling) IS populated here even when `get_product_constraints` is blank. Validate it persists over the next ~6 months |
| Overstock alert (coarse filter only) | `list_product_alerts(site_id, criticality=1)` | the "above max" alert; OK to shortlist candidates, but its **"Excess Value" is forward-projected** (exceeds current stock value, fires on under-stocked SKUs) — never sum / rank / show as € |
| Firm PO vs planned order | `list_orders(site_id, product_site_id)` | **Status 3 = firm/open PO** (cancel/defer); **Status 1 = planned/proposed** (nothing to cancel). Decides the action. Do NOT use the "Next Delivery" field for this |
| True demand rate (for cover, if needed) | `get_monthly_demand_forecast(site_id, product_site_id, start, end)` | trailing-average actual demand. **Never use Firm Demand 30d as a cover denominator** — it's the confirmed pipeline (≈0), overstates cover hugely |
| **Current stock (physical, on hand)** | `get_stock_levels(site_id, product_site_id=<id>, include_storage_breakdown=true)` | use **"Total Quantity"** (sum across storage). |
| Stock coverage (days) + zero-stock risk per SKU | `get_stock_coverage(site_id, max_coverage_days=N)` | "Coverage (days)"; use to find low-cover SKUs |
| New-product detection | `get_monthly_demand_forecast(site_id, product_site_id, start, end)` | count months with actual demand; < 6 = new. ERP "new" status is a proxy |
| Product planning policy (min/max, shelf life) | `get_product_constraints` | optional context |
| Supplier MOQ / lead time | `get_product_supplier_constraints` | optional context |
| Product details + tags + suppliers | `get_product_detail(site_id, product_site_id)` | for tags/links; its "Stock Level" is the NET field — do not use as current stock |
| Working capital — months of stock on hand | derived (no extra call) | `stock value ÷ monthly demand-value run-rate`, site-wide and per segment, from `get_site_kpis` total + per-tag. Exposes frozen capital (e.g. phase-out ~80 months) |
| Stock-health split (slide 6) | derived | `Healthy = total − over-max excess`; **excess = current stock value of validated above-max items** (Stock>Max sustained over 6 mo), split into firm-PO (cancel/defer) vs no-PO (destock). NOT the alert "Excess Value"; NOT a min/max split (blank on dynamic-buffer SKUs — read `Max` from `get_product_planning`) |
| Trend over time (12-month direction of travel) | `get_kpi_trends(site_id, kpi, start_date, end_date)` | **works** (date bug fixed). `kpi` is a strict enum. Confirmed: **`inventory_level`** → Value column = real stock value in € (reconciles to site total); **`zero_stock_days`** → service/risk. **Avoid `stock_coverage`** — its Value column just echoes Quantity, not a € figure. **Demand-in-value: no working enum found** (`demand`, `past_demand`, `future_demand`, … all rejected) — confirm the token with Flowlity before adding |

## Gotchas (learned the hard way)
- **Net vs physical stock.** `get_stock_coverage` "Stock Qty", `get_product_detail` "Stock Level",
  and plain `get_stock_levels` "Stock Qty" are a **net/available** position and can be negative or
  fractional (e.g. −8.69). The real current physical stock is the **storage-breakdown Total
  Quantity** (`include_storage_breakdown=true`). They diverge exactly on oversold/exposed SKUs.
- **Account context can switch** mid-session; re-run `list_sites` if a call denies access or the
  company changes. Build for whatever company is currently exposed.
- **ABC may be empty.** A class category can exist with zero products assigned — always confirm
  with a `get_site_kpis` tag filter (returns "No KPI data" when empty), then fall back to a
  3–4-tag category and ask the user.
- **No EOL field** anywhere in the product model — do not infer EOL (and an ABC "D" class is not
  EOL). Use overstock + real phase-out status for cash-at-risk.
- **New products have no MAPE** (no sales history) — `get_site_kpis` returns "—". Show n/a with
  the reason; consider a sell-through metric instead of a blank bar.
- **Per-tag alert counts are not filtered** — `get_site_kpis(tag)` repeats the site-level alert
  table. Trust the stock-value / ZSR / MAPE fields, not its alert counts.
- **The criticality-1 "Excess Value" is forward-projected, not current cash** — it often exceeds an
  item's current stock value and even fires on currently under-stocked SKUs. Use it only as a coarse
  candidate filter; judge real overstock from projected `Stock > Max` in `get_product_planning`.
- **Cover ≠ stock ÷ Firm Demand (30d).** Firm 30-day demand is the confirmed-order pipeline (≈0 for
  most SKUs) and overstates cover wildly (a slow SKU can read as 72 months on firm demand vs ~6 on real
  demand). Use trailing-average actual demand from `get_monthly_demand_forecast` if a cover figure
  is needed.
- **"Next Delivery" is not a firm PO.** It includes Flowlity planned (status-1) orders. The firm-PO
  signal is `list_orders` Status 3; status 1 = planned. Mislabeling planned orders as "cancel PO" is
  a real risk — always confirm via order status.
- **Dynamic buffers:** `get_product_constraints` Min/Max are blank under the "Flowlity" min policy —
  read the daily `Max` (and `Stock`) from `get_product_planning` instead.
- **Demo data** ("Fake" storage site, fractional pack quantities) is normal in sandboxes.
- **Logos can't always be fetched** in-sandbox (web_fetch refuses images; egress allow-listed).
  Use the wordmark fallback; in the customer's runtime the domain logo may be downloadable.

## deck_data.json schema
`build_deck.js` reads this; `generate_assets.py` reads only `meta.company` + `brand`.
Colours may be a palette name (`RED`, `STEEL`, `GREEN`, `AMBER`, `CHAR`, `MUTE`, `WHITE`) or a raw hex.

```
meta:   { company, site, period, currency }
brand:  { ink (hex), accent (hex), wordmark:{ main, suffix }, linkBase }
cover:  { title1, title2, subtitle, date, footer }
exec:   { kpis:[{v,l,sub,color,bar} ×4], banner:[{text,color,bold}], decisions:[[title,detail] ×3] }
inventory: { title, subtitle,
             splitA:{ title, labels[], values[], colors[], fmt, max, note:[{text,color,bold}] },
             splitB:{ ... }   # optional second panel for a second split dimension }
cash:   { title, bigValue, bigLabel, facts:[[v,l] ×3], bigNote,
          headline:[{text,color,bold}], tableTitle, tableCol,
          items:[{name,id,value}], caption }
availability: { title, kpis:[{v,l,color} ×2], riskTitle,
                risk:{ labels[], values[], fmt, max },
                exposedTitle, exposed:[{name,id,currentStock,coverage}], caption }
newForecast: { title,
               stockTitle, stockSub, stockSegments:[{label,value,pct,color,frac} ×2], stockNote,
               mapeTitle, mapeScale, mape:[{label,value|null,color,text}], mapeNote,
               trend:{ title, note, labels:[…12], yfmt, ymin, ymax, series:[{name,color,values:[…12]}] },
               // placeholder fallback (used only when `trend` is absent):
               trendTitle, trendTag, trendFrameLabel, trendBody:[{text,color,bold}] }
```
Notes:
- `items[].id` and `exposed[].id` are `product_site_id`; the script wraps the name in the Flowlity link.
- `exposed[].currentStock` must be the storage-breakdown total (see gotchas).
- A `mape` entry with `value:null` renders an empty bar + its `text` (use "n/a"). Keep `mape` to **4 rows**
  so it fits above the trend panel; set `mapeScale` above the largest value (e.g. 2200 for intermittent demand).
- `stockSegments` are stacked left→right by `frac` (0–1); use 2 segments (Healthy + Excess). Give them
  contrasting colours (e.g. GREEN + AMBER) — note RED maps to the brand accent, which may equal GREEN.
- `trend` (when present) renders **one combined line chart** from `get_kpi_trends`. All `series`
  share a single value axis, so keep them in the same unit — e.g. stock value (`inventory_level`
  Value) and demand value both in €M, with `yfmt:"\"€\"0.0\"M\""`. Use `ymin`/`ymax` to frame the
  movement; `note` carries the one-line takeaway. If `trend` is omitted the panel falls back to the
  placeholder below.
- Placeholder fallback: `trendBody` is rich-text runs; the script draws an empty axis frame labelled
  `trendFrameLabel` and an amber `trendTag` pill — use only when no trend data is available.
- Omit `splitB` to show a single full inventory panel.
```
