import { healthKey, readHealthCache, writeHealthCache } from './cache.js';
import { rankRecords } from './rank.js';
import type { ProxyRecord } from './sources/types.js';
import {
  checkProxy,
  DEFAULT_TEST_TARGET,
  FALLBACK_TEST_TARGET,
  DEFAULT_TIMEOUT_MS,
  mapWithConcurrency,
} from './validate.js';

export interface FindWorkingProxyOptions {
  testUrl?: string;
  timeoutMs?: number;
  maxCandidates?: number;
  concurrency?: number;
}

export interface WorkingProxyResult extends ProxyRecord {
  latencyMs: number;
  statusCode?: number;
  testUrl: string;
}

export interface FindWorkingProxyOutcome {
  best?: WorkingProxyResult;
  alternates: WorkingProxyResult[];
  testedCount: number;
  candidatePoolSize: number;
}

/**
 * Tests a ranked, capped batch of candidates concurrently, updates the on-disk health cache
 * for every proxy tested (success and failure), and returns the fastest successful result —
 * not just the first success — plus a few runner-ups.
 */
export async function findWorkingProxy(
  filtered: ProxyRecord[],
  options: FindWorkingProxyOptions = {},
): Promise<FindWorkingProxyOutcome> {
  const maxCandidates = options.maxCandidates ?? 25;
  const concurrency = options.concurrency ?? 10;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const health = await readHealthCache();
  const ranked = rankRecords(filtered, health);
  const candidates = ranked.slice(0, maxCandidates);

  if (candidates.length === 0) {
    return { alternates: [], testedCount: 0, candidatePoolSize: filtered.length };
  }

  const primaryTarget = options.testUrl ?? DEFAULT_TEST_TARGET;
  let { results, target } = await testBatch(candidates, primaryTarget, timeoutMs, concurrency);

  const anySuccess = results.some((r) => r.result.ok);
  if (!anySuccess && !options.testUrl) {
    ({ results, target } = await testBatch(candidates, FALLBACK_TEST_TARGET, timeoutMs, concurrency));
  }

  for (const { record, result } of results) {
    health[healthKey(record.ip, record.port)] = {
      lastCheckedAt: new Date().toISOString(),
      ok: result.ok,
      latencyMs: result.latencyMs,
      testUrl: target,
      statusCode: result.statusCode,
    };
  }
  await writeHealthCache(health);

  const successes = results
    .filter((r) => r.result.ok)
    .map(
      (r): WorkingProxyResult => ({
        ...r.record,
        latencyMs: r.result.latencyMs,
        statusCode: r.result.statusCode,
        testUrl: target,
      }),
    )
    .sort((a, b) => a.latencyMs - b.latencyMs);

  return {
    best: successes[0],
    alternates: successes.slice(1, 4),
    testedCount: results.length,
    candidatePoolSize: filtered.length,
  };
}

async function testBatch(
  candidates: ProxyRecord[],
  target: string,
  timeoutMs: number,
  concurrency: number,
) {
  const results = await mapWithConcurrency(candidates, concurrency, async (record) => ({
    record,
    result: await checkProxy(record.proxy, target, timeoutMs),
  }));
  return { results, target };
}
