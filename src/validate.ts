import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const DEFAULT_TEST_TARGET = 'https://httpbin.org/ip';
export const FALLBACK_TEST_TARGET = 'https://api.ipify.org';
export const DEFAULT_TIMEOUT_MS = 4_000;

export interface CheckResult {
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
}

function buildAgent(proxyUrl: string) {
  return proxyUrl.startsWith('socks') ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
}

/**
 * Validates a single proxy by making a real request through it to `testUrl`.
 * Success = request completed AND status in [200, 400), mirroring the reference tool's
 * curl-based check (2xx/3xx accepted, redirects included; body content is never inspected).
 */
export async function checkProxy(
  proxyUrl: string,
  testUrl: string = DEFAULT_TEST_TARGET,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CheckResult> {
  const agent = buildAgent(proxyUrl);
  const start = Date.now();

  // axios' `timeout` option only starts ticking once a socket exists, so a proxy that never
  // completes its TCP/TLS handshake (common for dead free proxies) can hang past it. An
  // AbortController timer covers every phase of the request regardless of where it's stuck.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await axios.get(testUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      proxy: false,
      timeout: timeoutMs,
      signal: controller.signal,
      validateStatus: () => true,
      responseType: 'text',
      maxRedirects: 3,
    });

    const latencyMs = Date.now() - start;
    const ok = resp.status >= 200 && resp.status < 400;
    return { ok, latencyMs, statusCode: resp.status };
  } catch (err) {
    const timedOut = controller.signal.aborted;
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: timedOut ? `timed out after ${timeoutMs}ms` : err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
    agent.destroy();
  }
}

/** Runs an async task over items with bounded concurrency, preserving input order in the result. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index] as T, index);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
