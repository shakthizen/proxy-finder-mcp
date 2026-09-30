import { fetchGeonode } from './geonode.js';
import { fetchProxifly } from './proxifly.js';
import { fetchProxyScrape } from './proxyscrape.js';
import type { ProxyRecord, SourceFetchResult, SourceName } from './types.js';

export type { ProxyRecord, ProxyProtocol, SourceName } from './types.js';

const FETCHERS: Array<{ name: SourceName; fetch: () => Promise<SourceFetchResult> }> = [
  { name: 'proxyscrape', fetch: fetchProxyScrape },
  { name: 'proxifly', fetch: fetchProxifly },
  { name: 'geonode', fetch: fetchGeonode },
];

export interface AggregatedFetch {
  records: ProxyRecord[];
  fetchedAt: string;
  /** Sources that failed to fetch this round, with their error message. */
  errors: Partial<Record<SourceName, string>>;
}

/** Fetches all sources concurrently, tolerating individual failures, and merges+dedupes by ip:port. */
export async function fetchAllSources(): Promise<AggregatedFetch> {
  const settled = await Promise.allSettled(FETCHERS.map((f) => f.fetch()));

  const allRecords: ProxyRecord[] = [];
  const errors: Partial<Record<SourceName, string>> = {};

  settled.forEach((result, i) => {
    const name = FETCHERS[i]!.name;
    if (result.status === 'fulfilled') {
      allRecords.push(...result.value.records);
    } else {
      errors[name] = result.reason instanceof Error ? result.reason.message : String(result.reason);
    }
  });

  const merged = mergeRecords(allRecords);
  return { records: merged, fetchedAt: new Date().toISOString(), errors };
}

/** Dedupes by ip:port, merging metadata from every source that reported the same proxy. */
export function mergeRecords(records: ProxyRecord[]): ProxyRecord[] {
  const byKey = new Map<string, ProxyRecord>();

  for (const record of records) {
    const key = `${record.ip}:${record.port}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...record });
      continue;
    }

    byKey.set(key, {
      ...existing,
      countryCode: existing.countryCode ?? record.countryCode,
      country: existing.country ?? record.country,
      city: existing.city ?? record.city,
      isp: existing.isp ?? record.isp,
      org: existing.org ?? record.org,
      anonymity: existing.anonymity ?? record.anonymity,
      sourceUptime: maxDefined(existing.sourceUptime, record.sourceUptime),
      sourceLatencyMs: minDefined(existing.sourceLatencyMs, record.sourceLatencyMs),
      sources: [...new Set([...existing.sources, ...record.sources])],
    });
  }

  return [...byKey.values()];
}

function maxDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

function minDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}
