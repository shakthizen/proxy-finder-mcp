import { describe, expect, it } from 'vitest';
import { mergeRecords } from './index.js';
import type { ProxyRecord } from './types.js';

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

describe('mergeRecords', () => {
  it('dedupes by ip:port', () => {
    const merged = mergeRecords([record({}), record({ sources: ['proxifly'] })]);
    expect(merged).toHaveLength(1);
  });

  it('keeps records with different ip:port separate', () => {
    const merged = mergeRecords([record({}), record({ ip: '5.6.7.8', proxy: 'http://5.6.7.8:8080' })]);
    expect(merged).toHaveLength(2);
  });

  it('unions the sources list for duplicates', () => {
    const merged = mergeRecords([
      record({ sources: ['proxyscrape'] }),
      record({ sources: ['geonode'] }),
      record({ sources: ['proxyscrape'] }),
    ]);
    expect(merged[0]?.sources.sort()).toEqual(['geonode', 'proxyscrape']);
  });

  it('fills in missing metadata from a later duplicate without overwriting existing values', () => {
    const merged = mergeRecords([
      record({ city: undefined, isp: 'ISP A' }),
      record({ city: 'Paris', isp: 'ISP B' }),
    ]);
    expect(merged[0]?.city).toBe('Paris');
    expect(merged[0]?.isp).toBe('ISP A');
  });

  it('takes the max self-reported uptime and min self-reported latency across duplicates', () => {
    const merged = mergeRecords([
      record({ sourceUptime: 50, sourceLatencyMs: 800 }),
      record({ sourceUptime: 90, sourceLatencyMs: 200 }),
    ]);
    expect(merged[0]?.sourceUptime).toBe(90);
    expect(merged[0]?.sourceLatencyMs).toBe(200);
  });
});
