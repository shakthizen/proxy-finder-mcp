import { describe, expect, it } from 'vitest';
import { countryName, normalizeCountry } from './countries.js';

describe('normalizeCountry', () => {
  it('accepts an ISO alpha-2 code in any case', () => {
    expect(normalizeCountry('FR')).toBe('FR');
    expect(normalizeCountry('fr')).toBe('FR');
  });

  it('accepts a full country name in any case', () => {
    expect(normalizeCountry('France')).toBe('FR');
    expect(normalizeCountry('france')).toBe('FR');
  });

  it('does a loose substring match for partial names', () => {
    expect(normalizeCountry('korea')).toBeDefined();
  });

  it('returns undefined for unrecognized input', () => {
    expect(normalizeCountry('Narnia')).toBeUndefined();
    expect(normalizeCountry('')).toBeUndefined();
  });
});

describe('countryName', () => {
  it('resolves a known code', () => {
    expect(countryName('FR')).toBe('France');
    expect(countryName('us')).toBe('United States');
  });

  it('returns undefined for an unknown code', () => {
    expect(countryName('ZZ')).toBeUndefined();
  });
});
