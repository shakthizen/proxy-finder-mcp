import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ProxyRecord } from './sources/types.js';

export const CACHE_DIR = join(homedir(), '.proxy-finder-mcp');
const SOURCES_CACHE_PATH = join(CACHE_DIR, 'sources.json');
const HEALTH_CACHE_PATH = join(CACHE_DIR, 'health.json');

export interface SourcesCache {
  fetchedAt: string;
  records: ProxyRecord[];
}

export interface HealthEntry {
  lastCheckedAt: string;
  ok: boolean;
  latencyMs: number;
  testUrl: string;
  statusCode?: number;
}

export type HealthCache = Record<string, HealthEntry>;

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await ensureCacheDir();
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readSourcesCache(): Promise<SourcesCache | undefined> {
  return readJson<SourcesCache>(SOURCES_CACHE_PATH);
}

export async function writeSourcesCache(cache: SourcesCache): Promise<void> {
  await writeJson(SOURCES_CACHE_PATH, cache);
}

export async function readHealthCache(): Promise<HealthCache> {
  return (await readJson<HealthCache>(HEALTH_CACHE_PATH)) ?? {};
}

export async function writeHealthCache(cache: HealthCache): Promise<void> {
  await writeJson(HEALTH_CACHE_PATH, cache);
}

/** True if a cache entry timestamp is still within ttlMs of now. */
export function isFresh(isoTimestamp: string, ttlMs: number): boolean {
  const age = Date.now() - new Date(isoTimestamp).getTime();
  return age >= 0 && age < ttlMs;
}

export function healthKey(ip: string, port: number): string {
  return `${ip}:${port}`;
}
