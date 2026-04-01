/**
 * Read Model Versioning — unit test
 * Microstep 5.1.2
 */

import { describe, it, expect } from 'vitest';
import type { ThreadReadModelV1 } from '../read-models/v1/ThreadReadModel';
import type { ThreadReadModelV2 } from '../read-models/v2/ThreadReadModel';
import { resolveReadModelVersion } from '../read-models/ReadModelVersionResolver';
import { getVersionsToWrite } from '../read-models/ProjectionWriteTarget';
import type { ThreadReadModel } from '../read-models/ThreadReadModel';
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('Read Model Versioning', () => {
  describe('Test 1 — Coesistenza v1 e v2', () => {
    it('v1 e v2 esistono come moduli distinti con tipi differenti', () => {
      const v1: ThreadReadModelV1 = {
        id: 't1',
        title: 'T1',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      const v2: ThreadReadModelV2 = {
        ...v1,
        slug: 't1-slug',
      };
      expect(v1.id).toBe('t1');
      expect(v2.slug).toBe('t1-slug');
      expect('slug' in v1).toBe(false);
      expect('slug' in v2).toBe(true);
    });
  });

  describe('Test 2 — Nessun breaking change', () => {
    it('v1 e ThreadReadModel (root) continuano a funzionare', () => {
      const legacy: ThreadReadModel = {
        id: 't1',
        title: 'T1',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(legacy.id).toBe('t1');
      expect(legacy.title).toBe('T1');
    });
  });

  describe('Test 3 — Projection decide target', () => {
    it('WRITE_V1_ONLY aggiorna solo v1', () => {
      const versions = getVersionsToWrite('WRITE_V1_ONLY');
      expect(versions).toEqual(['v1']);
    });

    it('WRITE_ALL aggiorna v1 e v2', () => {
      const versions = getVersionsToWrite('WRITE_ALL');
      expect(versions).toEqual(['v1', 'v2']);
    });
  });

  describe('Test 4 — Query per versione', () => {
    it('con v1 -> resolveReadModelVersion restituisce v1', () => {
      expect(resolveReadModelVersion('v1')).toBe('v1');
      expect(resolveReadModelVersion('V1')).toBe('v1');
    });

    it('con v2 -> resolveReadModelVersion restituisce v2', () => {
      expect(resolveReadModelVersion('v2')).toBe('v2');
    });

    it('con versione non supportata -> fallback a v1', () => {
      expect(resolveReadModelVersion('v99')).toBe('v1');
    });
  });

  describe('Test 5 — Controller agnostic', () => {
    it('i controller non contengono riferimento a v1, v2 o path read model', async () => {
      const routeFiles = await glob('src/api/http/routes/*.ts', {
        ignore: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
      });

      const violations: string[] = [];
      const forbidden = [
        /read-models\/v1/,
        /read-models\/v2/,
        /ThreadReadModelV1/,
        /ThreadReadModelV2/,
        /resolveReadModelVersion/,
        /getVersionsToWrite/,
      ];

      for (const file of routeFiles) {
        const content = readFileSync(file, 'utf-8');
        for (const pattern of forbidden) {
          if (pattern.test(content)) {
            violations.push(`${file}: contiene riferimento a versioning read model`);
            break;
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
