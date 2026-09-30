import { sourceHttp } from '../http.js';
import type { ProxyProtocol, ProxyRecord, SourceFetchResult } from './types.js';

const URL = 'https://proxylist.geonode.com/api/proxy-list?page=1&limit=500&sort_by=responseTime&sort_type=asc';

interface GeonodeItem {
  ip?: string;
  port?: number | string;
  protocols?: string[];
  country?: string;
  city?: string;
  isp?: string;
  org?: string;
  anonymityLevel?: string;
  responseTime?: number;
  speed?: number;
  upTime?: number;
}

interface GeonodeResponse {
  data?: GeonodeItem[];
}

/** Geonode lists every protocol a proxy answers to; pick the one that determines dialing behavior. */
function pickProtocol(protocols: string[] | undefined): ProxyProtocol | undefined {
  const set = new Set((protocols ?? []).map((p) => p.toLowerCase()));
  if (set.has('socks5')) return 'socks5';
  if (set.has('socks4')) return 'socks4';
  if (set.has('https')) return 'https';
  if (set.has('http')) return 'http';
  return undefined;
}

export async function fetchGeonode(): Promise<SourceFetchResult> {
  const resp = await sourceHttp.get<GeonodeResponse>(URL);
  const records: ProxyRecord[] = [];

  for (const item of resp.data.data ?? []) {
    const ip = (item.ip ?? '').trim();
    const port = Number(item.port);
    const protocol = pickProtocol(item.protocols);
    if (!ip || !Number.isFinite(port) || !protocol) continue;

    const countryCode = item.country?.trim().toUpperCase();

    records.push({
      proxy: `${protocol}://${ip}:${port}`,
      ip,
      port,
      protocol,
      countryCode: countryCode || undefined,
      city: item.city?.trim() || undefined,
      isp: item.isp?.trim() || undefined,
      org: item.org?.trim() || undefined,
      anonymity: item.anonymityLevel,
      sourceUptime: typeof item.upTime === 'number' ? item.upTime : undefined,
      sourceLatencyMs:
        typeof item.responseTime === 'number'
          ? item.responseTime
          : typeof item.speed === 'number'
            ? item.speed
            : undefined,
      sources: ['geonode'],
    });
  }

  return { source: 'geonode', records };
}
