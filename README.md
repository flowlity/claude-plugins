# Flowlity Claude Plugin Marketplace

Official Claude Code plugin marketplace for [Flowlity](https://www.flowlity.com) — supply-chain intelligence, straight from your data.

## Install

**1. Add this marketplace to Claude Code:**

```
/plugin marketplace add flowlity/claude-plugins
```

**2. Install the Flowlity Supply Chain Coplanner plugin:**

```
/plugin install flowlity-supply-chain-coplanner@flowlity
```

## Plugins

### flowlity-supply-chain-coplanner

A jump-start kit for new **Flowlity Coplanner** users. Bundles the Flowlity Co-Planner MCP connector with four ready-to-run skills:

| Skill | What it does |
|---|---|
| `getting-started` | First-run tour — checks the connection and offers a menu of high-value first actions |
| `data-quality-audit` | Ranked shortlist of master-data defects (missing supplier, stale lead time, wrong ABC class…) with concrete fixes |
| `forecast-audit` | Ranked shortlist of demand/forecast problems (bias, accuracy gaps, new products without history links…) |
| `sc-operations-presentation` | Branded 6-slide PowerPoint "Supply Chain Operations Review" pulled live from your data |

**Try saying…**

- "Help me get started with Flowlity" — runs the guided first-run tour
- "Run a data-quality audit on my items" — surfaces the top master-data defects to fix
- "Create a supply-chain operations review deck" — builds a ready-to-present PowerPoint from live data

> **Requires** an active Flowlity account, signed in to the Flowlity Co-Planner MCP server (`https://co-planner.app.flowlity.com/mcp`, the same server as the Flowlity Co-Planner connector in Claude's directory). See [`plugins/flowlity-coplanner/README.md`](plugins/flowlity-coplanner/README.md) for setup, and for what the plugin runs, sends and fetches.
