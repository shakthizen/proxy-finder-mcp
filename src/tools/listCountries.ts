import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { countryName } from '../countries.js';
import { getProxyPool } from '../proxyPool.js';
import { listCountriesInput } from '../schemas.js';
import { jsonResult, textErrorResult } from './result.js';

export function registerListCountries(server: McpServer): void {
  server.registerTool(
    'list_countries',
    {
      title: 'List available countries',
      description:
        'Lists the countries currently covered by the merged proxy pool, with a proxy count per ' +
        'country. Use this to discover what country codes are worth passing to find_proxy before ' +
        'asking for one.',
      inputSchema: listCountriesInput,
    },
    async (args) => {
      try {
        const pool = await getProxyPool({ forceRefresh: args.forceRefresh });
        const counts = new Map<string, number>();

        for (const record of pool.records) {
          if (!record.countryCode) continue;
          counts.set(record.countryCode, (counts.get(record.countryCode) ?? 0) + 1);
        }

        const countries = [...counts.entries()]
          .map(([code, count]) => ({ code, name: countryName(code) ?? code, count }))
          .sort((a, b) => b.count - a.count);

        return jsonResult({
          totalProxies: pool.records.length,
          countriesCovered: countries.length,
          countries,
          sourcePoolFetchedAt: pool.fetchedAt,
          sourcePoolFromCache: pool.fromCache,
        });
      } catch (err) {
        return textErrorResult(err);
      }
    },
  );
}
