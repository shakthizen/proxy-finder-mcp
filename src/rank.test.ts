import { describe, expect, it } from 'vitest';
import type { HealthCache } from './cache.js';
import { filterRecords, rankRecords } from './rank.js';
import type { ProxyRecord } from './sources/types.js';

function record(overrides: Partial<ProxyRecord>): ProxyRecord {
  return {
    proxy: 'http://1.2.3.4:8080',
    ip: '1.2.3.4',
    port: 8080,
    protocol: 'http',
    sources: ['proxyscrape'],
    ...overrides,
  };
}

describe('filterRecords', () => {
  const records = [
    record({ ip: '1.1.1.1', countryCode: 'FR', protocol: 'http' }),
    record({ ip: '2.2.2.2', countryCode: 'US', protocol: 'socks5' }),
    record({ ip: '3.3.3.3', countryCode: 'FR', protocol: 'socks5' }),
  ];

  it('filters by country code', () => {
    expect(filterRecords(records, { country: 'FR' }).map((r) => r.ip)).toEqual(['1.1.1.1', '3.3.3.3']);
  });

  it('filters by full country name', () => {
    expect(filterRecords(records, { country: 'France' }).map((r) => r.ip)).toEqual(['1.1.1.1', '3.3.3.3']);
  });

  it('filters by protocol', () => {
    expect(filterRecords(records, { protocol: 'socks5' }).map((r) => r.ip)).toEqual(['2.2.2.2', '3.3.3.3']);
  });

  it('"any" protocol is a no-op', () => {
    expect(filterRecords(records, { protocol: 'any' })).toHaveLength(3);
  });

  it('combines country and protocol filters', () => {
    expect(filterRecords(records, { country: 'FR', protocol: 'socks5' }).map((r) => r.ip)).toEqual(['3.3.3.3']);
  });

  it('throws for an unrecognized country', () => {
    expect(() => filterRecords(records, { country: 'Narnia' })).toThrow();
  });
});

describe('rankRecords', () => {
  it('puts fresh known-good proxies first, fastest first', () => {
    const a = record({ ip: '1.1.1.1' });
    const b = record({ ip: '2.2.2.2' });
    const health: HealthCache = {
      '1.1.1.1:8080': { lastCheckedAt: new Date().toISOString(), ok: true, latencyMs: 500, testUrl: 'x' },
      '2.2.2.2:8080': { lastCheckedAt: new Date().toISOString(), ok: true, latencyMs: 100, testUrl: 'x' },
    };
    expect(rankRecords([a, b], health).map((r) => r.ip)).toEqual(['2.2.2.2', '1.1.1.1']);
  });

  it('puts untested proxies before fresh known-bad ones', () => {
    const good = record({ ip: '1.1.1.1' });
    const bad = record({ ip: '2.2.2.2' });
    const health: HealthCache = {
      '2.2.2.2:8080': { lastCheckedAt: new Date().toISOString(), ok: false, latencyMs: 0, testUrl: 'x' },
    };
    expect(rankRecords([bad, good], health).map((r) => r.ip)).toEqual(['1.1.1.1', '2.2.2.2']);
  });

  it('treats a stale cache entry as untested', () => {
    const stale = record({ ip: '1.1.1.1' });
    const health: HealthCache = {
      '1.1.1.1:8080': {
        lastCheckedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        ok: true,
        latencyMs: 50,
        testUrl: 'x',
      },
    };
    // Stale entries fall into "unknown" tier, ranked by source-reported signals, not cached latency.
    const other = record({ ip: '2.2.2.2', sourceUptime: 99 });
    expect(rankRecords([stale, other], health).map((r) => r.ip)).toEqual(['2.2.2.2', '1.1.1.1']);
  });

  it('among untested proxies, ranks by higher self-reported uptime first', () => {
    const low = record({ ip: '1.1.1.1', sourceUptime: 40 });
    const high = record({ ip: '2.2.2.2', sourceUptime: 90 });
    expect(rankRecords([low, high], {}).map((r) => r.ip)).toEqual(['2.2.2.2', '1.1.1.1']);
  });
});
