import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { healthKey, readHealthCache, writeHealthCache } from '../cache.js';
import { checkProxyInput } from '../schemas.js';
import { checkProxy as runCheck, DEFAULT_TEST_TARGET } from '../validate.js';
import { jsonResult, textErrorResult } from './result.js';

const IP_PORT_RE = /^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/;

export function registerCheckProxy(server: McpServer): void {
  server.registerTool(
    'check_proxy',
    {
      title: 'Check a specific proxy',
      description:
        'Validates a single specific proxy (e.g. "socks5://1.2.3.4:1080" or "http://1.2.3.4:8080") ' +
        'by making a real request through it to a target URL. Use this to test a proxy you already ' +
        'have, or to re-check whether a specific site works through a given proxy after find_proxy ' +
        'returned it.',
      inputSchema: checkProxyInput,
    },
    async (args) => {
      try {
        const testUrl = args.testUrl ?? DEFAULT_TEST_TARGET;
        const result = await runCheck(args.proxy, testUrl, args.timeoutMs);

        const match = IP_PORT_RE.exec(args.proxy.replace(/^[a-z0-9]+:\/\//i, ''));
        if (match) {
          const health = await readHealthCache();
          health[healthKey(match[1] as string, Number(match[2]))] = {
            lastCheckedAt: new Date().toISOString(),
            ok: result.ok,
            latencyMs: result.latencyMs,
            testUrl,
            statusCode: result.statusCode,
          };
          await writeHealthCache(health);
        }

        return jsonResult({ proxy: args.proxy, testUrl, ...result });
      } catch (err) {
        return textErrorResult(err);
      }
    },
  );
}
