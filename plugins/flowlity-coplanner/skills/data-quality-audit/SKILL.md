---
name: data-quality-audit
description: >
  Produces a short, prioritized list of master-data and parameter anomalies for
  a Flowlity customer's item base, each with a concrete suggested fix and a
  value-based impact so the worst problems rank first. Use this skill whenever
  someone asks to run a data-quality check, audit master data or item
  parameters, find anomalies in a customer's items, build a "top 10 items to fix"
  list, flag stock-outs with no supplier, lead-time problems, ABC
  misclassifications, missing prices, or surface inactive items to deactivate.
  Also triggers on phrases like "data quality agent", "what should this customer
  fix in their data", "audit item parameters", "find dodgy items", or "master
  data review". Always use this skill — do NOT improvise a data-quality audit, as
  the anomaly checks, scoring, and output format are specific and must be applied
  consistently.
---

# data-quality-audit

Generates a **short, prioritized list of master-data and parameter anomalies**
for a customer's item base, each with a concrete suggested fix.

This answers a request planners make repeatedly: a proactive agent that hands
them a daily/weekly shortlist of *"items where something looks off"* instead of
forcing them to audit thousands of items by hand. The user's framing is usually
some version of *"give me the top 10 items I should change because the system
can't calculate them properly."*

Run it against the customer's real data through the **Flowlity MCP server** so
they see their own problem items surface automatically.

---

## Design principles

The shortlist is only useful if it respects these principles:

- **Short, not exhaustive.** Target **~10 items** per run, not hundreds. A daily
  user has no time for a long list. Rank hardest-hitting first and cut the tail.
- **Every flag is a DATA issue, and every fix corrects DATA**, not operations.
  This is the core rule of the skill. Each item flagged is a master-data or
  parameter defect on the item record — a missing, stale, default, or wrong
  value — and the suggested fix is always to **correct that field** (update the
  lead time, set the price, fix the ABC class, assign a supplier, set the active
  flag, set the primary supplier). The shortlist must **never** recommend an
  operational action such as "place an order", "expedite", or "build stock":
  those are planning decisions, not data fixes. When a symptom looks operational
  (e.g. "the next order lands too late"), name the **underlying data defect** that
  causes it (e.g. "the lead time is out of date") and fix that.
- **Every item needs a concrete data correction**, not just a flag. The user
  should be able to accept/reject a single field change.
- **Explain *why*** each item is flagged, in one plain sentence, framed as the
  data defect.
- **Ranking by impact is essential.** The entire value of the shortlist is that
  the biggest problems by value sit at the top — a daily user fixes from the top
  down and stops when out of time. Never present flags unranked, and never let a
  cosmetic issue outrank a large stock-out by value.
- It is acceptable, and expected, to recommend **deactivating an item** (a status
  data change) when it no longer moves, or **assigning a supplier** when one is
  missing (a master-data change) — concrete data corrections, not just flags.

---

## Inputs required

Confirm you have access to, or ask the user for:

1. **Item master data + supplier links** — per item: linked supplier(s), lead
   time, ABC tag, active status, and unit / valuation price. From
   `list_products`, `get_product_supplier_constraints`, and `list_tags`.
2. **Demand KPIs** — past demand in **quantity and value**:
   - **last 3 months** (Checks 2, 3, 6, 7): `get_demand_summary` → *Past Demand →
     Last 3 months* returns both Quantity and Value directly.
   - **last 12 months** (Checks 4, 5): `get_monthly_demand_forecast` over the
     trailing 12 months → sum the monthly *Actual Demand* (quantity); multiply by
     unit price for the value figure.
3. **Alerts & planning** — out-of-stock alerts and projected stock-outs across
   the horizon (date + quantity). From `get_order_alerts` / `list_product_alerts`
   and `get_product_planning`.
4. **Order history** — firm orders (**status = 3**) with order and reception
   dates, to compute actual lead times and the time to the next firm order. From
   `list_orders`.
5. **Current stock + unit price** — `list_products` exposes *Stock Qty*, *Stock
   Value*, and *Strategy* per item; derive unit price as Stock Value ÷ Stock Qty,
   or read the valuation price from `get_product_constraints`. Needed to value
   stock-outs (Check 1), remaining stock (Check 5), and to run the price check
   (Check 6).

Pull these from the **Flowlity MCP server** directly. If the connector is
unavailable, the fallback is the customer's ERP export (e.g. Sage X3) or an
equivalent item-master / sales-history workbook.

---

## Anomaly checks

Run every check below across the item base. Each produces candidate flags, and
each defines its **own impact metric in monetary value** (see Scoring). **Run
Check 6 (missing price) first** — it protects the value-based ranking of every
other check.

Every check below is a named **data-issue category** — the heading IS the data
defect, not a symptom. Use that exact category name in the output so the planner
sees a data problem (and a field to fix), never an operational task. The
categories are: missing supplier link, placeholder lead time, **lead time not
updated**, wrong ABC category, item not deactivated, missing valuation price,
and no primary supplier set.

### Check 1 — Missing supplier link (data issue) — out-of-stock alert, no supplier on the record
- Scan whether the product has an **out-of-stock alert anywhere on the horizon**
  (`get_order_alerts` / `list_product_alerts`; `get_product_planning` for the
  projected stock-out date and quantity).
- Scan whether a **supplier is linked** to the product
  (`get_product_supplier_constraints` — does any supplier resolve?).
- **Flag** the item when there **is an out-of-stock alert but no supplier is
  linked** — it cannot be replenished.
- *Suggested fix:* "Item projects a stock-out on <date> but has no supplier
  assigned — assign a supplier so it can be replenished."
- **Impact:** size of the stock-out **in value** (stock-out quantity × unit
  price).

### Check 2 — Placeholder lead time (data issue) — lead time = 1 on a moving item
- Scan **past demand over the last 3 months** (`get_demand_summary` → Past
  Demand → Last 3 months); keep only items with **demand > 0**.
- Read `get_product_supplier_constraints`; if the **lead time = 1**, flag the
  item (a 1-day lead time on a moving item is almost always a missing/default
  value).
- *Suggested fix:* "Item has sold in the last 3 months but its lead time is set
  to 1 — confirm and update the real supplier lead time."
- **Impact:** past demand over the **last 3 months in value**.

### Check 3 — Lead time not updated (data issue) — configured lead time is stale/wrong
The data defect is the **lead time on the item record being out of date**. A
next firm order that lands far too late for the configured lead time is the
*symptom*; the cause is almost always that the lead time no longer reflects
reality (supplier terms changed, or it was never refreshed). Flag the **data**,
fix the **field** — do **not** tell the planner to place or expedite an order.
- `get_product_supplier_constraints` → the configured lead time.
- `list_orders` → order date vs reception date to compute **actual recent lead
  times**; only consider **firm orders (status = 3)**. A gap between the actual
  realised lead time and the configured value is direct evidence the field is
  stale.
- **Flag** the item if the **time until the next firm order** meets **either**
  condition (a strong signal the configured lead time is no longer trustworthy):
  - time to next firm order **> 2 × lead time**, or
  - time to next firm order **> lead time + 30 days**.
- *Suggested fix:* "Configured lead time (<L> days) looks out of date — recent
  firm orders / order timing imply a different lead time; review and update the
  lead time on the item record so planning recalculates correctly."
- **Impact:** past demand over the **last 3 months in value**.

### Check 4 — Wrong ABC category (data issue) — assigned class contradicts the value
- `list_products` → tags; `list_tags` to enumerate the ABC tag set. **If there
  is no ABC tag, skip this check.**
- `get_monthly_demand_forecast` over the **trailing 12 months** → sum *Actual
  Demand* and multiply by unit price = the **12-month value** to test against the
  assigned class.
- **Flag** items whose ABC class contradicts the 12-month value — e.g. a
  high-value item sitting in class **C/D**, or a dormant item in class **A**.
- *Suggested fix:* "Item generated <value> over 12 months but is classified
  <class> — recommend reclassifying to <class>."
- **Impact:** demand **in value over the last 12 months**.

### Check 5 — Item not deactivated (data issue) — no demand for 12 months but still flagged active
- `get_monthly_demand_forecast` over the **trailing 12 months** → sum *Actual
  Demand* (quantity).
- **If 12-month demand = 0**, the data defect is that the item's **active status
  is stale** — it should be marked inactive.
- *Suggested fix:* "No demand in 12 months — set the item's status to inactive so
  it stops being planned/replenished."
- **Impact:** **current total stock in value**.

### Check 6 — Missing valuation price (data issue) — null or zero unit price (run first)
- Scan the unit price for every item (`list_products` *Stock Value* ÷ *Stock
  Qty*, or `get_product_constraints` valuation price).
- **Flag** any item with a **null or zero** unit price. This is run **before all
  other checks** because every value-based impact (Checks 1, 2, 3, 4, 5, 7)
  silently collapses to ~0 when price is missing, which would push real problems
  to the bottom of the ranking.
- *Suggested fix:* "No valuation price set — fill the unit price so the item is
  costed correctly and can be prioritised."
- **Impact:** because this item's own price is missing, estimate it: take the
  item's **past demand over the last 3 months in quantity** and multiply by the
  **average unit price across a sample of ~100 products** (any reasonable sample
  from the base). This is a rough proxy purely so the flag can be ranked.

### Check 7 — No primary supplier set (data issue) — multiple suppliers, none marked primary
- `get_product_supplier_constraints(primary_supplier_only=False)` → list every
  supplier linked to the product.
- **Flag** items that have **more than one supplier linked but no primary
  resolves** (the quota split doesn't designate a primary), so ordering logic has
  no default supplier to pick.
- *Suggested fix:* "Item has N linked suppliers but no primary — set the primary
  supplier (quota share) so orders route automatically."
- **Impact:** past demand over the **last 3 months in value**
  (`get_demand_summary`).

---

## Scoring and ranking

**Ranking by impact is the point of this skill, not an afterthought.** A daily
user works the list top-down and stops when out of time, so the largest problems
by value must sit at the top. Each check defines its **own impact metric,
expressed in monetary value (the site's currency)**:

| Check | Data-issue category | Impact basis |
|---|---|---|
| 1 | Missing supplier link | size of the stock-out in value |
| 2 | Placeholder lead time | past demand, last 3 months, in value |
| 3 | Lead time not updated | past demand, last 3 months, in value |
| 4 | Wrong ABC category | demand in value, last 12 months |
| 5 | Item not deactivated | current total stock in value |
| 6 | Missing valuation price | last-3-months demand qty × avg price of ~100-product sample (estimate) |
| 7 | No primary supplier set | past demand, last 3 months, in value |

Because every impact is expressed in the same currency, flags are directly
comparable across checks. Rank all flags by impact value descending and **keep
the top ~10**. If multiple checks flag the same item, merge them into one entry
that lists every issue, and rank that entry by its highest single impact value.

**Always ensure a mix of checks.** When the user asks for a "Top X" list, the
shortlist must include results from **at least 3 different checks** — never let
one check dominate the whole list, even if pure impact ranking would fill it from
a single check. If the top of the ranking is concentrated in one or two checks,
substitute the highest-impact items from other checks to reach at least 3 checks
represented, while otherwise staying as close to impact order as possible.

---

## Output

Produce a single ranked shortlist — a table — with these columns:

| # | Item | Description | Data issue (category) | Why it's flagged (1 sentence) | Data fix | Impact | Flowlity link |
|---|---|---|---|---|---|---|---|

The **Data issue** column must use the check's data-issue category name (e.g.
"Lead time not updated", "Wrong ABC category", "Missing valuation price") — never
an operational symptom like "order too late". The **Data fix** column must name
the field to correct, never an operational action ("place an order", "expedite").

**Always include the Flowlity link column.** Build the URL by appending the
item's `product_site_id` to:

```
https://app.flowlity.com/planning/products/planning/products/<product_site_id>
```

e.g. product_site_id `96905626` →
`https://app.flowlity.com/planning/products/planning/products/96905626`. Render
it as a clickable link in the markdown table so the planner can jump straight to
the item.

Keep it to **~10 rows**. Below the table, add a one-line summary: how many items
were scanned, how many flagged in total, and how many shown.

Deliver as a markdown file saved to the user's outputs folder and also present the
table inline in the conversation.

Do **not** apply any changes automatically — this skill only *recommends*. Each
row is something the planner accepts or rejects.

---

## Demo notes

- Lead with the planner's own pain: they have no time to audit master data by
  hand, so the system should hand them the shortlist.
- The strongest live moments are **Check 1** (missing supplier link — a record
  that literally can't be replenished) and **Check 3** (lead time not updated —
  the configured lead time no longer matches reality): both are concrete data
  defects with an obvious field to correct.
- Frame it as Flowlity taking **shared responsibility for data quality** — the
  daily user can't audit thousands of items, so the system surfaces the few that
  matter most.
