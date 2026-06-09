---
name: getting-started
description: >
  Orients a brand-new Flowlity Coplanner user: explains what the Coplanner
  connector can do, runs a quick connection check against their account, and
  offers a short menu of high-value first actions (data-quality audit, forecast
  audit, supply-chain operations review). Use this skill whenever someone is new
  to Flowlity / Coplanner and asks "what can you do", "where do I start", "how do
  I use Flowlity here", "help me get started", "what can I ask you", "give me a
  tour", "I just connected Flowlity", or any first-run / onboarding-style request.
  Also trigger when a user seems unsure what the Flowlity connector or this plugin
  is for. Always use this skill for first-run orientation — do NOT improvise a
  tour, as it must verify the connection and point to the right companion skills.
metadata:
  version: "0.1.0"
---

# getting-started

Give a new Flowlity Coplanner user a fast, concrete on-ramp: confirm their
connector works, show them their own account in one line, and hand them a short
menu of valuable first actions that map to the other skills in this plugin. Keep
it warm, short, and action-oriented — the goal is that within one or two messages
the user has run something real against their own data.

## Principles

- **Verify before promising.** Always confirm the Coplanner connector responds
  and name the account before describing capabilities, so the user sees it is
  live against *their* data, not a generic pitch.
- **Show, don't lecture.** Offer 3–4 concrete things to try, each phrased as a
  sentence the user can say back verbatim. Avoid a feature dump.
- **Hand off to the right skill.** This skill orients; the companion skills do the
  deep work. Route the user to them rather than reproducing their logic here.
- **Never invent data.** If a call fails or returns nothing, say so plainly and
  suggest checking the connection rather than fabricating figures.

## Workflow

### 1. Connection check
Call `list_sites` on the Flowlity Coplanner connector.

- **If it returns sites:** capture every accessible `site_id`, the company name,
  and currency. Report in one line, e.g. "You're connected to *DemoCompany*
  (2 sites, EUR)."
- **If it fails or returns nothing:** tell the user the connector isn't responding
  yet, and suggest they confirm the Flowlity Coplanner connector is enabled and
  authorized in their connector settings. Do not continue to step 2 with invented
  data.

### 2. One-line account snapshot (optional, fast)
If sites resolved and it's cheap, pull a single high-level read so the tour feels
real — e.g. `get_site_kpis(site_id)` for the primary site, or `list_products`
count. Summarize in one sentence (item count, total stock value, or similar).
Keep this to a single call; don't run a full analysis here.

### 3. Offer the first-action menu
Present a short menu (3–4 items). For each, give the plain-language outcome and
the exact phrase the user can say to trigger it. Map them to the companion skills:

- **Data-quality audit** — "Find the master-data and parameter problems hurting my
  planning." → *"Run a data-quality audit on my items"* (triggers
  `data-quality-audit`: a ranked top-~10 list of items with a concrete data fix and
  value impact each — missing suppliers, stale lead times, wrong ABC class, etc.).
- **Forecast audit** — "Show me where the demand forecast is wrong and why." →
  *"Run a forecast audit"* (triggers `forecast-audit`: a ranked shortlist of SKUs
  with demand drops, new products lacking a similar-product link, or persistent
  bias, each with a forecast-input fix).
- **Supply-chain operations review** — "Build me an executive review of inventory
  health and risk." → *"Create a supply-chain operations review deck"* (triggers
  `sc-operations-presentation`: a branded 6-slide PPTX with inventory health, cash
  at risk, availability risk and forecast quality, every figure pulled live).
- **Explore my data** — "Ask Flowlity anything about my products, stock, orders,
  alerts or KPIs." → e.g. *"What are my top stock-out risks right now?"* or
  *"Which items have the most stock value?"* (answered directly from connector
  tools like `list_product_alerts`, `get_stock_levels`, `get_site_kpis`).

### 4. Let them choose
End by inviting the user to pick one, or to just ask a supply-chain question in
their own words. If they pick a menu item, hand off to the matching skill. Keep
the closing short — one or two sentences.

## Notes

- The connector's account context can change between calls; if a later call
  reports a different company or access denied, re-run `list_sites` and tell the
  user which account they're now on.
- This plugin pairs the getting-started tour with three deep skills
  (`data-quality-audit`, `forecast-audit`, `sc-operations-presentation`) and the
  Flowlity Coplanner connector. Point power users to those directly once oriented.
