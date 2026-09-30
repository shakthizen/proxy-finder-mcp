---
title: proxy-finder-mcp
---

# proxy-finder-mcp

An MCP server that finds and validates **working free HTTP/HTTPS/SOCKS proxies**, optionally
filtered by country. Built for agents that need to route a request through a specific country to
debug or bypass geo-blocking — no manual proxy hunting required.

[View source on GitHub](https://github.com/shakthizen/proxy-finder-mcp) ·
[View on npm](https://www.npmjs.com/package/proxy-finder-mcp)

## Install

No install step needed — it runs directly via `npx`.

### Claude Code

```bash
claude mcp add proxy-finder -- npx -y proxy-finder-mcp
```

### Claude Desktop / other JSON-config clients

```json
{
  "mcpServers": {
    "proxy-finder": {
      "command": "npx",
      "args": ["-y", "proxy-finder-mcp"]
    }
  }
}
```

### Cursor

Add the same block to `.cursor/mcp.json`.

### Google Antigravity

Open **Manage MCP Servers** (Command Palette → "MCP") and add a new server, or edit its
`mcp_config.json` with the same `mcpServers` block shown above.

## Tools

| Tool | Description |
| --- | --- |
| `find_proxy` | Finds a live, validated proxy, optionally filtered by country/protocol — returns the fastest working candidate plus backups. |
| `check_proxy` | Validates one specific proxy against a target URL. |
| `list_proxies` | Lists merged/ranked candidates without live-testing. |
| `list_countries` | Lists which countries are currently covered, with counts. |

Full parameter reference and usage examples are in the
[README](https://github.com/shakthizen/proxy-finder-mcp#readme).

## Why

Free proxy lists rot fast — most "working" entries are already dead by the time you read them.
This server aggregates three sources, live-tests candidates before handing one back, and caches
results locally so an agent gets a proxy that's actually confirmed working *right now*, not just
self-reported as alive.
