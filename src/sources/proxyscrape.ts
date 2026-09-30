import { sourceHttp } from '../http.js';
import type { ProxyProtocol, ProxyRecord, SourceFetchResult } from './types.js';

const URL =
  'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=json';

const KNOWN_PROTOCOLS = new Set<ProxyProtocol>(['http', 'https', 'socks4', 'socks5']);

interface ProxyScrapeIpData {
  countryCode?: string;
  country?: string;
  city?: string;
  isp?: string;
  org?: string;
}

interface ProxyScrapeItem {
  proxy?: string;
  ip?: string;
  port?: number | string;
  protocol?: string;
  uptime?: number | string;
  average_timeout?: number | string;
  ip_data?: ProxyScrapeIpData;
}

interface ProxyScrapeResponse {
  proxies?: ProxyScrapeItem[];
}

export async function fetchProxyScrape(): Promise<SourceFetchResult> {
  const resp = await sourceHttp.get<ProxyScrapeResponse>(URL);
  const records: ProxyRecord[] = [];

  for (const item of resp.data.proxies ?? []) {
    const ip = (item.ip ?? '').trim();
    const port = Number(item.port);
    const protocol = (item.protocol ?? '').toLowerCase();
    if (!ip || !Number.isFinite(port) || !KNOWN_PROTOCOLS.has(protocol as ProxyProtocol)) continue;

    const proxy = (item.proxy ?? '').trim() || `${protocol}://${ip}:${port}`;
    const ipData = item.ip_data ?? {};

    records.push({
      proxy,
      ip,
      port,
      protocol: protocol as ProxyProtocol,
      countryCode: ipData.countryCode?.trim().toUpperCase() || undefined,
      country: ipData.country?.trim() || undefined,
      city: ipData.city?.trim() || undefined,
      isp: ipData.isp?.trim() || undefined,
      org: ipData.org?.trim() || undefined,
      sourceUptime: item.uptime !== undefined ? Number(item.uptime) : undefined,
      sourceLatencyMs:
        item.average_timeout !== undefined ? Number(item.average_timeout) : undefined,
      sources: ['proxyscrape'],
    });
  }

  return { source: 'proxyscrape', records };
}
