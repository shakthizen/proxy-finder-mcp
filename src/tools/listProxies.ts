import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readHealthCache } from '../cache.js';
import { getProxyPool } from '../proxyPool.js';
import { filterRecords, rankRecords } from '../rank.js';
import { listProxiesInput } from '../schemas.js';
import { jsonResult, textErrorResult } from './result.js';

export function registerListProxies(server: McpServer): void {
  server.registerTool(
    'list_proxies',
    {
      title: 'List candidate proxies',
      description:
        'Lists merged, deduped proxies from all sources, optionally filtered by country/protocol, ' +
        'ranked cache-first (previously confirmed-fast proxies first). Does not perform any live ' +
        'network testing, so it is fast; use find_proxy when you need a proxy that is actually ' +
        'confirmed working right now.',
      inputSchema: listProxiesInput,
    },
    async (args) => {
      try {
        const pool = await getProxyPool({ forceRefresh: args.forceRefresh });
        const filtered = filterRecords(pool.records, { country: args.country, protocol: args.protocol });
        const health = await readHealthCache();
        const ranked = rankRecords(filtered, health);
        const limit = args.limit ?? 50;

        return jsonResult({
          total: filtered.length,
          returned: Math.min(limit, ranked.length),
          proxies: ranked.slice(0, limit),
          sourcePoolFetchedAt: pool.fetchedAt,
          sourcePoolFromCache: pool.fromCache,
        });
      } catch (err) {
        return textErrorResult(err);
      }
    },
  );
}
