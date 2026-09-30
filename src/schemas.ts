import { z } from 'zod';

export const protocolSchema = z
  .enum(['http', 'https', 'socks4', 'socks5', 'any'])
  .describe('Proxy protocol to filter by, or "any" for no filter.');

export const findProxyInput = {
  country: z
    .string()
    .optional()
    .describe('ISO 3166-1 alpha-2 country code (e.g. "FR") or full country name (e.g. "France"). Omit for any country.'),
  protocol: protocolSchema.optional(),
  testUrl: z
    .string()
    .url()
    .optional()
    .describe('URL to validate candidates against. Defaults to a generic IP-echo endpoint; pass the site you actually need to reach (e.g. the one your curl just failed against) for a more relevant check.'),
  timeoutMs: z.number().int().positive().max(30_000).optional().describe('Per-proxy check timeout in ms. Default 4000.'),
  maxCandidates: z.number().int().positive().max(100).optional().describe('Max candidates to live-test. Default 25.'),
  concurrency: z.number().int().positive().max(50).optional().describe('Max concurrent checks. Default 10.'),
  forceRefresh: z.boolean().optional().describe('Bypass the cached proxy list and re-fetch all sources.'),
};

export const checkProxyInput = {
  proxy: z.string().describe('Full proxy URL to validate, e.g. "socks5://1.2.3.4:1080" or "http://1.2.3.4:8080".'),
  testUrl: z.string().url().optional().describe('URL to validate against. Defaults to a generic IP-echo endpoint.'),
  timeoutMs: z.number().int().positive().max(30_000).optional().describe('Check timeout in ms. Default 4000.'),
};

export const listProxiesInput = {
  country: z.string().optional().describe('ISO 3166-1 alpha-2 country code or full country name. Omit for any country.'),
  protocol: protocolSchema.optional(),
  limit: z.number().int().positive().max(500).optional().describe('Max results to return. Default 50.'),
  forceRefresh: z.boolean().optional().describe('Bypass the cached proxy list and re-fetch all sources.'),
};

export const listCountriesInput = {
  forceRefresh: z.boolean().optional().describe('Bypass the cached proxy list and re-fetch all sources.'),
};
