/**
 * Product Modes — Conformance (C.9)
 * Determinismo; no modifica payload; constraints; hide/promote; kill-switch → DEFAULT; no IRIS/Messaging.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { OrchestratedFeature } from '../../feature-orchestrator/OrchestratedFeature';
import {
  DefaultProductModeApplier,
  applyProductMode,
  getProductMode,
  PRODUCT_MODE_COMPONENT_ID,
  type ProductModeRegistry,
  type ProductModeInput,
} from '../index';

const PRODUCT_MODES_ROOT = join(process.cwd(), 'src', 'product', 'product-modes');

function makeRegistry(enabled: boolean): ProductModeRegistry {
  return { [PRODUCT_MODE_COMPONENT_ID]: enabled };
}

function makeFeature(
  featureId: string,
  output: unknown,
  order: number,
  visibility: 'primary' | 'secondary' | 'hidden'
): OrchestratedFeature<unknown> {
  return Object.freeze({
    featureId,
    output,
    order,
    visibility,
  });
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'tests') {
        collectTsFiles(full, acc);
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        acc.push(full);
      }
    }
  } catch {
    // ignore
  }
  return acc;
}

describe('Product Modes — Conformance', () => {
  const now = 1704110400000;

  describe('1. Determinismo', () => {
    it('stesso input produce stesso output (ordine e visibility)', () => {
      const outA = Object.freeze({ title: 'A', derivedAt: now });
      const outB = Object.freeze({ focusLevel: 'high' as const, derivedAt: now });
      const features = Object.freeze([
        makeFeature('smart-summary', outA, 0, 'primary'),
        makeFeature('daily-focus', outB, 1, 'secondary'),
      ]);
      const input: ProductModeInput = Object.freeze({
        mode: 'DEFAULT',
        features,
        now,
      });
      const a = applyProductMode(input);
      const b = applyProductMode(input);
      expect(a.length).toBe(b.length);
      expect(a.map((f) => f.featureId)).toEqual(b.map((f) => f.featureId));
      expect(a.map((f) => f.visibility)).toEqual(b.map((f) => f.visibility));
    });
  });

  describe('2. Nessuna modifica ai payload feature', () => {
    it('output in OrchestratedFeature sono i medesimi riferimenti passati', () => {
      const out1 = Object.freeze({ status: 'ok' as const, derivedAt: now });
      const out2 = Object.freeze({ ready: false, reason: 'N/A', derivedAt: now });
      const features = Object.freeze([
        makeFeature('wellbeing', out1, 0, 'primary'),
        makeFeature('voice-readiness', out2, 1, 'secondary'),
      ]);
      const input: ProductModeInput = Object.freeze({
        mode: 'WELLBEING',
        features,
        now,
      });
      const result = applyProductMode(input);
      const byId = new Map(result.map((f) => [f.featureId, f]));
      expect(byId.get('wellbeing')?.output).toBe(out1);
      expect(byId.get('voice-readiness')?.output).toBe(out2);
    });
  });

  describe('3. Constraints rispettati', () => {
    it('DEFAULT rispetta maxPrimary 1 e maxSecondary 2', () => {
      const features = Object.freeze([
        makeFeature('smart-summary', {}, 0, 'primary'),
        makeFeature('daily-focus', {}, 1, 'secondary'),
        makeFeature('wellbeing', {}, 2, 'secondary'),
        makeFeature('voice-readiness', {}, 3, 'hidden'),
      ]);
      const input: ProductModeInput = Object.freeze({
        mode: 'DEFAULT',
        features,
        now,
      });
      const result = applyProductMode(input);
      const primary = result.filter((f) => f.visibility === 'primary');
      const secondary = result.filter((f) => f.visibility === 'secondary');
      expect(primary.length).toBeLessThanOrEqual(1);
      expect(secondary.length).toBeLessThanOrEqual(2);
    });

    it('FOCUS rispetta maxPrimary 1 e maxSecondary 0', () => {
      const features = Object.freeze([
        makeFeature('daily-focus', {}, 0, 'primary'),
        makeFeature('smart-summary', {}, 1, 'secondary'),
      ]);
      const input: ProductModeInput = Object.freeze({
        mode: 'FOCUS',
        features,
        now,
      });
      const result = applyProductMode(input);
      const mode = getProductMode('FOCUS');
      const primary = result.filter((f) => f.visibility === 'primary');
      const secondary = result.filter((f) => f.visibility === 'secondary');
      expect(primary.length).toBeLessThanOrEqual(mode.constraints.maxPrimary);
      expect(secondary.length).toBeLessThanOrEqual(mode.constraints.maxSecondary);
    });
  });

  describe('4. Hide / Promote funzionanti', () => {
    it('FOCUS nasconde smart-summary e voice-readiness', () => {
      const features = Object.freeze([
        makeFeature('smart-summary', {}, 0, 'primary'),
        makeFeature('daily-focus', {}, 1, 'secondary'),
        makeFeature('voice-readiness', {}, 2, 'hidden'),
      ]);
      const input: ProductModeInput = Object.freeze({
        mode: 'FOCUS',
        features,
        now,
      });
      const result = applyProductMode(input);
      const ids = result.map((f) => f.featureId);
      expect(ids).not.toContain('smart-summary');
      expect(ids).not.toContain('voice-readiness');
      expect(ids).toContain('daily-focus');
    });

    it('VOICE_FIRST mette voice-readiness in testa (promote)', () => {
      const features = Object.freeze([
        makeFeature('daily-focus', {}, 0, 'primary'),
        makeFeature('voice-readiness', {}, 1, 'secondary'),
      ]);
      const input: ProductModeInput = Object.freeze({
        mode: 'VOICE_FIRST',
        features,
        now,
      });
      const result = applyProductMode(input);
      expect(result[0].featureId).toBe('voice-readiness');
    });
  });

  describe('5. Kill-switch OFF -> DEFAULT', () => {
    it('con registry OFF apply usa comportamento DEFAULT (stessi vincoli)', () => {
      const features = Object.freeze([
        makeFeature('smart-summary', {}, 0, 'primary'),
        makeFeature('daily-focus', {}, 1, 'secondary'),
        makeFeature('wellbeing', {}, 2, 'hidden'),
      ]);
      const applierOff = new DefaultProductModeApplier(makeRegistry(false));
      const applierDefault = new DefaultProductModeApplier(makeRegistry(true));
      const inputFocus: ProductModeInput = Object.freeze({
        mode: 'FOCUS',
        features,
        now,
      });
      const inputDefault: ProductModeInput = Object.freeze({
        mode: 'DEFAULT',
        features,
        now,
      });
      const resultWhenOff = applierOff.apply(inputFocus);
      const resultDefault = applierDefault.apply(inputDefault);
      expect(resultWhenOff.length).toBe(resultDefault.length);
      const primaryOff = resultWhenOff.filter((f) => f.visibility === 'primary').length;
      const secondaryOff = resultWhenOff.filter((f) => f.visibility === 'secondary').length;
      expect(primaryOff).toBeLessThanOrEqual(1);
      expect(secondaryOff).toBeLessThanOrEqual(2);
    });
  });

  describe('6. Nessuna dipendenza da IRIS / Messaging', () => {
    it('nessun file in product-modes/ importa da iris o da messaging-system', () => {
      const files = collectTsFiles(PRODUCT_MODES_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = fromMatch[1];
            if (path.includes('iris')) violations.push(file);
            if (path.includes('messaging-system')) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });
});

// Product Modes sono lenti UX.
// Modificano la presentazione, non il comportamento.
// Non introducono decisione ne' intelligenza.
