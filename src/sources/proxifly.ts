import { sourceHttp } from '../http.js';
import type { ProxyProtocol, ProxyRecord, SourceFetchResult } from './types.js';

const URL = 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/all/data.json';

const KNOWN_PROTOCOLS = new Set<ProxyProtocol>(['http', 'https', 'socks4', 'socks5']);

interface ProxiflyItem {
  proxy?: string;
  protocol?: string;
  ip?: string;
  port?: number | string;
  anonymity?: string;
  score?: number;
  geolocation?: {
    country?: string;
    city?: string;
  };
}

export async function fetchProxifly(): Promise<SourceFetchResult> {
  const resp = await sourceHttp.get<ProxiflyItem[]>(URL);
  const records: ProxyRecord[] = [];

  for (const item of resp.data ?? []) {
    const ip = (item.ip ?? '').trim();
    const port = Number(item.port);
    const protocol = (item.protocol ?? '').toLowerCase();
    if (!ip || !Number.isFinite(port) || !KNOWN_PROTOCOLS.has(protocol as ProxyProtocol)) continue;

    const proxy = (item.proxy ?? '').trim() || `${protocol}://${ip}:${port}`;
    const geo = item.geolocation ?? {};
    const countryCode = geo.country?.trim().toUpperCase();

    records.push({
      proxy,
      ip,
      port,
      protocol: protocol as ProxyProtocol,
      countryCode: countryCode && countryCode !== 'UNKNOWN' ? countryCode : undefined,
      city: geo.city && geo.city !== 'Unknown' ? geo.city : undefined,
      anonymity: item.anonymity,
      // Proxifly's "score" is roughly 1-10; scale to a 0-100 uptime-ish signal for ranking.
      sourceUptime: typeof item.score === 'number' ? Math.min(100, item.score * 10) : undefined,
      sources: ['proxifly'],
    });
  }

  return { source: 'proxifly', records };
}
