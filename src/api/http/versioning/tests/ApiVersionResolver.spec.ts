/**
 * ApiVersionResolver — unit test
 * Microstep 5.1.1 — API Versioning
 */

import { describe, it, expect } from 'vitest';
import { ApiVersionResolver } from '../ApiVersionResolver';
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('ApiVersionResolver', () => {
  const resolver = new ApiVersionResolver();

  it('risoluzione da URL: /api/v2/resource -> v2', () => {
    const v = resolver.resolve({ url: '/api/v2/resource' });
    expect(v.id).toBe('v2');
  });

  it('risoluzione da header X-API-Version: v1 -> v1', () => {
    const v = resolver.resolve({
      url: '/resource',
      headers: { 'X-API-Version': 'v1' },
    });
    expect(v.id).toBe('v1');
  });

  it('priorita URL > Header', () => {
    const v = resolver.resolve({
      url: '/api/v2/threads',
      headers: { 'X-API-Version': 'v1' },
    });
    expect(v.id).toBe('v2');
  });

  it('default backward-compatible: nessuna versione -> v1', () => {
    const v = resolver.resolve({ url: '/threads' });
    expect(v.id).toBe('v1');
  });

  it('versione non supportata v99: fallback a default', () => {
    const v = resolver.resolve({ url: '/api/v99/threads' });
    expect(v.id).toBe('v1');
  });

  it('controller agnostic: nessun riferimento a versioning nei controller', async () => {
    const routeFiles = await glob('src/api/http/routes/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
    });

    const violations: string[] = [];
    for (const file of routeFiles) {
      const content = readFileSync(file, 'utf-8');
      if (/ApiVersionResolver|ApiVersion\.v1|ApiVersion\.v2/.test(content)) {
        violations.push(`${file}: contiene riferimento a versioning`);
      }
    }
    expect(violations).toEqual([]);
  });
});
