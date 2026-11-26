# Flowlity Supply Chain Coplanner

A jump-start kit for new **Flowlity Coplanner** users. Connect once, then get
real value out of your own supply-chain data in minutes — no setup beyond the
connector. It bundles the Flowlity Co-Planner connector with three ready-to-run
analysis skills and a guided first-run tour.

## Overview

New Coplanner users often don't know what to ask first. This plugin removes that
friction: it wires in the Flowlity Co-Planner connector and ships skills that turn
the data behind it into immediate, concrete output — a prioritized data-quality
shortlist, a forecast-quality shortlist, and an executive operations-review deck —
plus a getting-started guide that orients newcomers and points them at the right
skill.

## Requirements

This plugin is a companion to the **Flowlity Coplanner** product. It only does
useful work against a live Flowlity account:

- An **active Flowlity account** with at least one site of data.
- The **Flowlity Co-Planner connector** (`https://co-planner.app.flowlity.com/mcp`)
  authorized for that account. You sign in with your Flowlity account through
  OAuth 2.0 (dynamic client registration); no client ID, secret or API key is
  stored in the plugin.

Without a connected, authorized Flowlity account the skills have no data to read.
The `getting-started` skill verifies the connection first and tells you if it
isn't reachable.

## Components

| Component | Name | Purpose |
|---|---|---|
| MCP connector | Flowlity Co-Planner | Live access to the user's Flowlity supply-chain data (products, stock, orders, alerts, demand, forecasts, KPIs). |
| Skill | getting-started | First-run tour: checks the connection, names the account, and offers a menu of high-value first actions. |
| Skill | data-quality-audit | Ranked top-~10 list of master-data / parameter defects (missing supplier, stale lead time, wrong ABC class, missing price, etc.), each with a concrete data fix and value-based impact. |
| Skill | forecast-audit | Ranked shortlist of demand- and forecast-quality problems (demand drops, new products with no similar-product link, persistent bias, unexplained low accuracy), each with a forecast-input fix. |
| Skill | sc-operations-presentation | Branded 6-slide PowerPoint "Supply Chain Operations Review" — inventory health, cash at risk, availability risk and forecast quality, every figure pulled live. |

## Setup

1. Install the plugin in Claude Code:

   ```
   /plugin install flowlity-supply-chain-coplanner --marketplace flowlity/claude-plugins
   ```

2. Sign in when Claude Code asks you to authenticate the `flowlity` MCP server
   (`https://co-planner.app.flowlity.com/mcp`), or run `/mcp` and pick it. This
   is the same server as the **Flowlity Co-Planner** connector in Claude's
   connector directory, so if you already use that connector you see the same
   tools and data. No environment variables or API keys are stored in the
   plugin.

## What the plugin runs, sends and fetches

- **Flowlity Co-Planner MCP server** (`https://co-planner.app.flowlity.com/mcp`,
  sign-in at `https://auth.app.flowlity.com`): every skill reads your supply-chain
  data through this server's tools, with your own Flowlity account and only for
  the sites it can see. Your supply-chain data goes only to Flowlity, never to any
  other service.
- **`sc-operations-presentation`** runs two bundled scripts on your machine
  (`scripts/generate_assets.py`, `scripts/build_deck.js`) and, the first time,
  installs their dependencies in the working directory from the public npm and
  PyPI registries: `pptxgenjs@4.0.1` and, unless already present, `Pillow==13.0.0`
  in a virtual environment. The deck is written to your working directory. Its
  QA step uses LibreOffice (`soffice`) and `pdftoppm` when they are installed.
- Product names in the outputs link to your products in the Flowlity web app
  (`https://app.flowlity.com`); the plugin does not open them itself.

Privacy policy: https://www.flowlity.com/privacy-policy

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
