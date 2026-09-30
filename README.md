# proxy-finder-mcp

[![npm version](https://img.shields.io/npm/v/proxy-finder-mcp.svg)](https://www.npmjs.com/package/proxy-finder-mcp)
[![CI](https://github.com/shakthizen/proxy-finder-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shakthizen/proxy-finder-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/shakthizen/proxy-finder-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/shakthizen/proxy-finder-mcp/actions/workflows/release.yml)
[![license](https://img.shields.io/npm/l/proxy-finder-mcp.svg)](./LICENSE)

An MCP (Model Context Protocol) server that finds and validates **working free HTTP/HTTPS/SOCKS
proxies**, optionally filtered by country. Built for agents that need to route a request or
`curl` through a specific country — a geo-blocked municipal site, a region-locked API, or just
debugging why a request fails from one network but not another.

It aggregates three free proxy-list sources (ProxyScrape, Proxifly, Geonode), merges and dedupes
them, and **actually tests candidates live** (not just trusting self-reported uptime) before
handing one back — with a local disk cache so repeat calls don't re-scrape or re-test everything
from scratch.

Pure TypeScript, zero external process dependencies (no `curl`/`ffmpeg`/etc. required) — works
anywhere Node.js does, install-free via `npx`.

## Install

No install step needed — run it directly with `npx`. Add it to your MCP client's config:

### Claude Code

```bash
claude mcp add proxy-finder -- npx -y proxy-finder-mcp
```

### Claude Desktop / other JSON-config clients

Add to your MCP config file (e.g. `claude_desktop_config.json`):

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

Add to `.cursor/mcp.json`:

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

### Google Antigravity

Open the **Manage MCP Servers** panel (Command Palette → "MCP") and add a new server, or edit
its `mcp_config.json` directly with the same `mcpServers` block used above:

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

## Tools

| Tool | Description |
| --- | --- |
| `find_proxy` | Finds a live, validated proxy, optionally filtered by `country` and/or `protocol`. Tests a batch of candidates concurrently and returns the **fastest working one**, plus a few backups. |
| `check_proxy` | Validates one specific proxy string (e.g. `socks5://1.2.3.4:1080`) against a target URL — useful for re-checking a proxy against the exact site you need. |
| `list_proxies` | Lists merged/deduped/ranked candidates without live-testing — fast, cache-aware. |
| `list_countries` | Lists which countries are currently covered by the proxy pool, with counts, so you know what to ask `find_proxy` for. |

### `find_proxy` parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `country` | string | — | ISO alpha-2 code (`"FR"`) or full name (`"France"`). Omit for any country. |
| `protocol` | `http \| https \| socks4 \| socks5 \| any` | `any` | Restrict to a proxy protocol. |
| `testUrl` | string | `https://httpbin.org/ip` | Validate candidates against this URL instead — e.g. the site your `curl` just failed against. |
| `timeoutMs` | number | `4000` | Per-proxy check timeout. |
| `maxCandidates` | number | `25` | How many ranked candidates to live-test. |
| `concurrency` | number | `10` | How many checks to run in parallel. |
| `forceRefresh` | boolean | `false` | Bypass the cached proxy list and re-fetch all sources. |

### Example

> "I need a working proxy in France to check if this site is geo-blocked."

The agent calls `find_proxy` with `{ "country": "FR" }` and gets back something like:

```json
{
  "found": true,
  "proxy": {
    "proxy": "socks4://31.59.234.26:40001",
    "ip": "31.59.234.26",
    "port": 40001,
    "protocol": "socks4",
    "countryCode": "FR",
    "city": "Amiens",
    "latencyMs": 1918,
    "statusCode": 200,
    "testUrl": "https://httpbin.org/ip"
  },
  "alternates": [ ... ],
  "testedCount": 25,
  "candidatePoolSize": 225
}
```

## How it works

1. **Sources** — ProxyScrape v4, Proxifly's static list, and Geonode's proxy-list API are fetched
   concurrently and merged, deduped by `ip:port`. The merged list is cached on disk for 10
   minutes so repeat tool calls don't hammer any source.
2. **Ranking** — before live-testing, candidates are sorted cache-first: previously-confirmed
   fast proxies come first (fastest first), then untested proxies (best self-reported
   uptime/speed first), then previously-failed proxies last.
3. **Validation** — a capped, concurrency-bounded batch of ranked candidates is dialed for real
   (via `axios` + `https-proxy-agent`/`socks-proxy-agent` — no shelling out to `curl`) against a
   target URL. Success = the request completes with an HTTP status in `[200, 400)`.
4. **Caching** — every tested proxy's result (success *and* failure) is written to
   `~/.proxy-finder-mcp/health.json` with a timestamp, so later calls skip re-testing recently
   confirmed-fast or confirmed-dead proxies.

## Local development

```bash
git clone https://github.com/shakthizen/proxy-finder-mcp.git
cd proxy-finder-mcp
npm install
npm run build
npm run typecheck
npm run lint
npm test
node dist/index.js   # runs the server over stdio
```

## License

MIT © [shakthizen](https://github.com/shakthizen)
