# Flowlity Supply Chain Coplanner

A jump-start kit for new **Flowlity Coplanner** users. Connect once, then get
real value out of your own supply-chain data in minutes — no setup beyond the
connector. It bundles the Flowlity Coplanner connector with three ready-to-run
analysis skills and a guided first-run tour.

## Overview

New Coplanner users often don't know what to ask first. This plugin removes that
friction: it wires in the Flowlity Coplanner connector and ships skills that turn
the data behind it into immediate, concrete output — a prioritized data-quality
shortlist, a forecast-quality shortlist, and an executive operations-review deck —
plus a getting-started guide that orients newcomers and points them at the right
skill.

## Requirements

This plugin is a companion to the **Flowlity Coplanner** product. It only does
useful work against a live Flowlity account:

- An **active Flowlity Coplanner account** with at least one site of data.
- The **Flowlity Coplanner connector** (`https://mcp.app.flowlity.com`) enabled
  and authorized for that account — you authenticate through the standard
  connector OAuth flow. No secrets are stored in the plugin (the bundled
  `client_id` is a public OAuth client identifier).

Without a connected, authorized Flowlity account the skills have no data to read.
The `getting-started` skill verifies the connection first and tells you if it
isn't reachable.

## Components

| Component | Name | Purpose |
|---|---|---|
| MCP connector | Flowlity Coplanner | Live access to the user's Flowlity supply-chain data (products, stock, orders, alerts, demand, forecasts, KPIs). |
| Skill | getting-started | First-run tour: checks the connection, names the account, and offers a menu of high-value first actions. |
| Skill | data-quality-audit | Ranked top-~10 list of master-data / parameter defects (missing supplier, stale lead time, wrong ABC class, missing price, etc.), each with a concrete data fix and value-based impact. |
| Skill | forecast-audit | Ranked shortlist of demand- and forecast-quality problems (demand drops, new products with no similar-product link, persistent bias, unexplained low accuracy), each with a forecast-input fix. |
| Skill | sc-operations-presentation | Branded 6-slide PowerPoint "Supply Chain Operations Review" — inventory health, cash at risk, availability risk and forecast quality, every figure pulled live. |

## Setup

1. Install the plugin.
2. Make sure the **Flowlity Coplanner** connector (`https://mcp.app.flowlity.com`, registered in the plugin as `flowlity`)
   is enabled and authorized for your account. The bundled connector entry matches
   it by name and URL; you authenticate through the normal connector flow — no
   environment variables or API keys are stored in the plugin.

The `sc-operations-presentation` skill builds decks with `pptxgenjs` and renders
QA images; it installs its own dependencies (`npm install pptxgenjs`,
`pip install Pillow`) at run time in the working directory.

## Usage

- New here? Say **"Help me get started with Flowlity"** → runs `getting-started`.
- **"Run a data-quality audit on my items"** → `data-quality-audit`.
- **"Run a forecast audit"** / **"Where is the model wrong?"** → `forecast-audit`.
- **"Create a supply-chain operations review deck"** → `sc-operations-presentation`.

You can also just ask supply-chain questions in plain language ("What are my top
stock-out risks?", "Which items hold the most stock value?") and they'll be
answered directly from the connector.

## License

Proprietary — see [`LICENSE`](LICENSE). © Flowlity. Use is permitted only in
connection with an authorized Flowlity Coplanner account.
