export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

export type SourceName = 'proxyscrape' | 'proxifly' | 'geonode';

export interface ProxyRecord {
  /** Full dialable proxy URL, e.g. "socks5://1.2.3.4:1080" */
  proxy: string;
  ip: string;
  port: number;
  protocol: ProxyProtocol;
  /** ISO 3166-1 alpha-2, uppercase, when known */
  countryCode?: string;
  country?: string;
  city?: string;
  isp?: string;
  org?: string;
  anonymity?: string;
  /** Self-reported uptime percentage (0-100) from the source, when available */
  sourceUptime?: number;
  /** Self-reported latency/response time in ms from the source, when available */
  sourceLatencyMs?: number;
  sources: SourceName[];
}

export interface SourceFetchResult {
  source: SourceName;
  records: ProxyRecord[];
}
