import { healthKey, isFresh, type HealthCache } from './cache.js';
import { normalizeCountry } from './countries.js';
import type { ProxyProtocol, ProxyRecord } from './sources/types.js';

export const HEALTHY_TTL_MS = 5 * 60 * 1000; // known-good result trusted for 5 min
export const UNHEALTHY_TTL_MS = 15 * 60 * 1000; // known-bad result deprioritized for 15 min

export interface FilterOptions {
  country?: string;
  protocol?: ProxyProtocol | 'any';
}

export function filterRecords(records: ProxyRecord[], options: FilterOptions): ProxyRecord[] {
  const countryCode = options.country ? normalizeCountry(options.country) : undefined;
  if (options.country && !countryCode) {
    throw new Error(
      `Unrecognized country "${options.country}". Use an ISO 3166-1 alpha-2 code (e.g. "FR") or a full country name.`,
    );
  }

  return records.filter((record) => {
    if (countryCode && record.countryCode !== countryCode) return false;
    if (options.protocol && options.protocol !== 'any' && record.protocol !== options.protocol) {
      return false;
    }
    return true;
  });
}

type HealthTier = 'good' | 'unknown' | 'bad';

function healthTier(record: ProxyRecord, health: HealthCache): { tier: HealthTier; latencyMs?: number } {
  const entry = health[healthKey(record.ip, record.port)];
  if (!entry) return { tier: 'unknown' };

  if (entry.ok && isFresh(entry.lastCheckedAt, HEALTHY_TTL_MS)) {
    return { tier: 'good', latencyMs: entry.latencyMs };
  }
  if (!entry.ok && isFresh(entry.lastCheckedAt, UNHEALTHY_TTL_MS)) {
    return { tier: 'bad' };
  }
  return { tier: 'unknown' };
}

const TIER_ORDER: Record<HealthTier, number> = { good: 0, unknown: 1, bad: 2 };

/**
 * Orders candidates cache-first: known-fast proxies first (fastest first), then untested
 * proxies (best source-reported signal first), then known-bad proxies last.
 */
export function rankRecords(records: ProxyRecord[], health: HealthCache): ProxyRecord[] {
  return [...records].sort((a, b) => {
    const ha = healthTier(a, health);
    const hb = healthTier(b, health);

    if (ha.tier !== hb.tier) return TIER_ORDER[ha.tier] - TIER_ORDER[hb.tier];

    if (ha.tier === 'good') {
      return (ha.latencyMs ?? Infinity) - (hb.latencyMs ?? Infinity);
    }

    // Untested (or both bad): prefer higher self-reported uptime, then lower self-reported latency.
    const uptimeDiff = (b.sourceUptime ?? -1) - (a.sourceUptime ?? -1);
    if (uptimeDiff !== 0) return uptimeDiff;
    return (a.sourceLatencyMs ?? Infinity) - (b.sourceLatencyMs ?? Infinity);
  });
}
