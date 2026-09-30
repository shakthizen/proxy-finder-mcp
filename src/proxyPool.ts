import { isFresh, readSourcesCache, writeSourcesCache } from './cache.js';
import { fetchAllSources } from './sources/index.js';
import type { ProxyRecord } from './sources/types.js';

export const DEFAULT_SOURCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface ProxyPool {
  records: ProxyRecord[];
  fetchedAt: string;
  fromCache: boolean;
  errors: Partial<Record<string, string>>;
}

/**
 * Returns the merged proxy list, reusing the on-disk cache when fresh.
 * Falls back to a stale cache (rather than failing) if a live refresh errors out entirely.
 */
export async function getProxyPool(options: {
  forceRefresh?: boolean;
  ttlMs?: number;
} = {}): Promise<ProxyPool> {
  const ttlMs = options.ttlMs ?? DEFAULT_SOURCE_TTL_MS;

  if (!options.forceRefresh) {
    const cached = await readSourcesCache();
    if (cached && isFresh(cached.fetchedAt, ttlMs)) {
      return { records: cached.records, fetchedAt: cached.fetchedAt, fromCache: true, errors: {} };
    }
  }

  try {
    const result = await fetchAllSources();
    if (result.records.length > 0) {
      await writeSourcesCache({ fetchedAt: result.fetchedAt, records: result.records });
      return { records: result.records, fetchedAt: result.fetchedAt, fromCache: false, errors: result.errors };
    }
    // All sources returned nothing (or all failed) — try to fall back to stale cache below.
    throw new Error('All proxy sources returned zero records');
  } catch (err) {
    const cached = await readSourcesCache();
    if (cached) {
      return {
        records: cached.records,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        errors: { fetch: err instanceof Error ? err.message : String(err) },
      };
    }
    throw err;
  }
}
