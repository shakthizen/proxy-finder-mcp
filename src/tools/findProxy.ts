import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findWorkingProxy } from '../findWorkingProxy.js';
import { getProxyPool } from '../proxyPool.js';
import { filterRecords } from '../rank.js';
import { findProxyInput } from '../schemas.js';
import { jsonResult, textErrorResult } from './result.js';

export function registerFindProxy(server: McpServer): void {
  server.registerTool(
    'find_proxy',
    {
      title: 'Find a working proxy',
      description:
        'Finds a live, validated free proxy, optionally filtered by country and/or protocol. ' +
        'Tests a batch of candidates concurrently against a target URL and returns the fastest ' +
        'one that actually works, plus a few backups. Use this when a direct request/curl is ' +
        'geo-blocked or otherwise failing and you need a working proxy to route through.',
      inputSchema: findProxyInput,
    },
    async (args) => {
      try {
        const pool = await getProxyPool({ forceRefresh: args.forceRefresh });
        const filtered = filterRecords(pool.records, { country: args.country, protocol: args.protocol });

        if (filtered.length === 0) {
          return jsonResult({
            found: false,
            message: `No proxies matched the given filters (country=${args.country ?? 'any'}, protocol=${args.protocol ?? 'any'}) out of ${pool.records.length} known proxies. Try list_countries to see what's currently available.`,
          });
        }

        const outcome = await findWorkingProxy(filtered, {
          testUrl: args.testUrl,
          timeoutMs: args.timeoutMs,
          maxCandidates: args.maxCandidates,
          concurrency: args.concurrency,
        });

        if (!outcome.best) {
          return jsonResult({
            found: false,
            message: `Tested ${outcome.testedCount} of ${outcome.candidatePoolSize} matching candidates and none responded successfully. Try again (candidates rotate), widen the filters, or raise timeoutMs/maxCandidates.`,
          });
        }

        return jsonResult({
          found: true,
          proxy: outcome.best,
          alternates: outcome.alternates,
          testedCount: outcome.testedCount,
          candidatePoolSize: outcome.candidatePoolSize,
          sourcePoolFetchedAt: pool.fetchedAt,
          sourcePoolFromCache: pool.fromCache,
        });
      } catch (err) {
        return textErrorResult(err);
      }
    },
  );
}
