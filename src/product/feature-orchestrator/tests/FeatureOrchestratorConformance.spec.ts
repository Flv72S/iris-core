/**
 * Feature Orchestrator — Conformance (C.8)
 * Determinismo; no modifica output; max 1 primary; max 2 secondary; null escluse; kill-switch; no IRIS/Messaging.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { UxExperienceState } from '../../ux-experience/UxExperienceState';
import {
  DefaultFeatureOrchestrator,
  orchestrateFeatures,
  FEATURE_ORCHESTRATOR_COMPONENT_ID,
  type FeatureOrchestratorRegistry,
  type FeatureOrchestratorInput,
  type FeatureOutputEntry,
} from '../index';

const ORCHESTRATOR_ROOT = join(process.cwd(), 'src', 'product', 'feature-orchestrator');

function makeRegistry(enabled: boolean): FeatureOrchestratorRegistry {
  return { [FEATURE_ORCHESTRATOR_COMPONENT_ID]: enabled };
}

function makeExperience(overrides: Partial<UxExperienceState>): UxExperienceState {
  return Object.freeze({
    label: 'NEUTRAL',
    confidenceBand: 'low',
    stability: 'stable',
    dominantSignals: Object.freeze([]),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'neutral',
    explanation: 'No clear experience state available.',
    derivedAt: 0,
    ...overrides,
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

describe('Feature Orchestrator — Conformance', () => {
  const now = 1704110400000;

  describe('1. Determinismo (stesso input -> stesso ordering)', () => {
    it('stesso input produce stesso ordine e stesse visibility', () => {
      const featureOutputs: FeatureOutputEntry[] = [
        { featureId: 'daily-focus', output: { focusLevel: 'high', derivedAt: now } },
        { featureId: 'smart-summary', output: { title: 'Summary', highlights: [], derivedAt: now } },
      ];
      const input: FeatureOrchestratorInput = Object.freeze({
        experience: makeExperience({ label: 'FOCUSED', derivedAt: now }),
        featureOutputs: Object.freeze(featureOutputs),
        now,
      });
      const a = orchestrateFeatures(input);
      const b = orchestrateFeatures(input);
      expect(a.length).toBe(b.length);
      expect(a.map((o) => o.featureId)).toEqual(b.map((o) => o.featureId));
      expect(a.map((o) => o.order)).toEqual(b.map((o) => o.order));
      expect(a.map((o) => o.visibility)).toEqual(b.map((o) => o.visibility));
    });
  });

  describe('2. Nessuna modifica agli output delle pipeline', () => {
    it('output nelle OrchestratedFeature sono i medesimi riferimenti/valori passati', () => {
      const out1 = Object.freeze({ focusLevel: 'high' as const, derivedAt: now });
      const out2 = Object.freeze({ title: 'X', highlights: [] as readonly string[], derivedAt: now });
      const input: FeatureOrchestratorInput = Object.freeze({
        experience: makeExperience({ derivedAt: now }),
        featureOutputs: Object.freeze([
          { featureId: 'daily-focus', output: out1 },
          { featureId: 'smart-summary', output: out2 },
        ]),
        now,
      });
      const result = orchestrateFeatures(input);
      const byId = new Map(result.map((o) => [o.featureId, o]));
      expect(byId.get('daily-focus')?.output).toBe(out1);
      expect(byId.get('smart-summary')?.output).toBe(out2);
    });
  });

  describe('3. Max 1 primary', () => {
    it('al massimo un elemento ha visibility primary', () => {
      const featureOutputs: FeatureOutputEntry[] = [
        { featureId: 'smart-summary', output: { title: 'A', highlights: [], derivedAt: now } },
        { featureId: 'daily-focus', output: { focusLevel: 'medium', derivedAt: now } },
        { featureId: 'wellbeing', output: { status: 'ok', explanation: 'Ok', derivedAt: now } },
        { featureId: 'voice-readiness', output: { ready: false, reason: 'N/A', derivedAt: now } },
      ];
      const input: FeatureOrchestratorInput = Object.freeze({
        experience: makeExperience({ label: 'FOCUSED', derivedAt: now }),
        featureOutputs: Object.freeze(featureOutputs),
        now,
      });
      const result = orchestrateFeatures(input);
      const primary = result.filter((o) => o.visibility === 'primary');
      expect(primary.length).toBeLessThanOrEqual(1);
    });
  });

  describe('4. Max 2 secondary', () => {
    it('al massimo due elementi hanno visibility secondary', () => {
      const featureOutputs: FeatureOutputEntry[] = [
        { featureId: 'smart-summary', output: { title: 'A', highlights: [], derivedAt: now } },
        { featureId: 'daily-focus', output: { focusLevel: 'medium', derivedAt: now } },
        { featureId: 'wellbeing', output: { status: 'ok', explanation: 'Ok', derivedAt: now } },
        { featureId: 'voice-readiness', output: { ready: false, reason: 'N/A', derivedAt: now } },
      ];
      const input: FeatureOrchestratorInput = Object.freeze({
        experience: makeExperience({ label: 'FOCUSED', derivedAt: now }),
        featureOutputs: Object.freeze(featureOutputs),
        now,
      });
      const result = orchestrateFeatures(input);
      const secondary = result.filter((o) => o.visibility === 'secondary');
      expect(secondary.length).toBeLessThanOrEqual(2);
    });
  });

  describe('5. Feature null -> escluse', () => {
    it('entry con output null non compaiono nel risultato', () => {
      const input: FeatureOrchestratorInput = Object.freeze({
        experience: makeExperience({ derivedAt: now }),
        featureOutputs: Object.freeze([
          { featureId: 'smart-summary', output: null },
          { featureId: 'daily-focus', output: { focusLevel: 'low', derivedAt: now } },
        ]),
        now,
      });
      const result = orchestrateFeatures(input);
      expect(result.length).toBe(1);
      expect(result[0].featureId).toBe('daily-focus');
    });
  });

  describe('6. Kill-switch OFF -> output vuoto', () => {
    it('con registry OFF orchestrate ritorna lista vuota', () => {
      const orchestrator = new DefaultFeatureOrchestrator(makeRegistry(false));
      const input: FeatureOrchestratorInput = Object.freeze({
        experience: makeExperience({ derivedAt: now }),
        featureOutputs: Object.freeze([
          { featureId: 'daily-focus', output: { focusLevel: 'high', derivedAt: now } },
        ]),
        now,
      });
      const result = orchestrator.orchestrate(input);
      expect(result).toEqual([]);
    });
  });

  describe('7. Nessuna dipendenza da IRIS o Messaging', () => {
    it('nessun file in feature-orchestrator/ importa da iris o da messaging-system', () => {
      const files = collectTsFiles(ORCHESTRATOR_ROOT);
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

// Feature Orchestrator coordina output di prodotto.
// Non decide, non agisce, non modifica il sistema.
// Serve esclusivamente a garantire coerenza UX.
