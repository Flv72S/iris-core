/**
 * Feature Pipelines — Conformance C.7 (Demo-Oriented)
 * Determinismo; kill-switch; Smart Inbox per FOCUSED/WAITING; FocusWellbeing una sola feature; no proprietà proibite; no IRIS/Execution; output immutabile.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { UxExperienceState } from '../../ux-experience/UxExperienceState';
import type { UxStateSnapshot } from '../../../messaging-system/ux-state/UxStateSnapshot';
import {
  createSmartInboxPipeline,
  createFocusWellbeingPipeline,
  FeaturePipelineEngine,
  FEATURE_PIPELINE_COMPONENT_ID,
  type FeaturePipelineInput,
  type FeatureOutput,
} from '../index';

const PIPELINES_ROOT = join(process.cwd(), 'src', 'product', 'feature-pipelines');

const FORBIDDEN_KEYS = [
  'action',
  'command',
  'execute',
  'recommendation',
  'score',
  'automation',
  'learning',
  'sideEffect',
];

function makeRegistry(enabled: boolean): import('../index').FeaturePipelineRegistry {
  return { [FEATURE_PIPELINE_COMPONENT_ID]: enabled };
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

function makeInput(
  experience: UxExperienceState,
  now: number,
  uxState?: UxStateSnapshot
): FeaturePipelineInput {
  const snap: UxStateSnapshot =
    uxState ?? Object.freeze({ states: Object.freeze([]), derivedAt: now });
  return Object.freeze({
    uxState: snap,
    experience,
    now,
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

describe('Feature Pipelines — Conformance (Demo-Oriented)', () => {
  const now = 1704110400000;

  describe('1. Determinismo', () => {
    it('stesso input produce stesso output', () => {
      const experience = makeExperience({ label: 'FOCUSED', derivedAt: now });
      const input = makeInput(experience, now);
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      const a = engine.run(input, makeRegistry(true));
      const b = engine.run(input, makeRegistry(true));
      expect(a.length).toBe(b.length);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });

  describe('2. Kill-switch OFF -> output vuoto', () => {
    it('con registry OFF run ritorna array vuoto', () => {
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      const input = makeInput(makeExperience({ label: 'FOCUSED', derivedAt: now }), now);
      const result = engine.run(input, makeRegistry(false));
      expect(result).toEqual([]);
    });
  });

  describe('3. Smart Inbox produce output coerente per FOCUSED / WAITING', () => {
    it('FOCUSED -> Smart Inbox visibility reduced', () => {
      const pipeline = createSmartInboxPipeline();
      const input = makeInput(makeExperience({ label: 'FOCUSED', derivedAt: now }), now);
      const out = pipeline.run(input);
      expect(out).not.toBeNull();
      expect(out!.featureType).toBe('SMART_INBOX');
      expect(out!.visibility).toBe('reduced');
    });
    it('WAITING -> Smart Inbox visibility visible, priority high', () => {
      const pipeline = createSmartInboxPipeline();
      const input = makeInput(makeExperience({ label: 'WAITING', derivedAt: now }), now);
      const out = pipeline.run(input);
      expect(out).not.toBeNull();
      expect(out!.featureType).toBe('SMART_INBOX');
      expect(out!.visibility).toBe('visible');
      expect(out!.priority).toBe('high');
    });
  });

  describe('4. FocusWellbeingPipeline produce una sola feature', () => {
    it('una sola feature per run (FOCUS_GUARD o WELLBEING_GATE o null)', () => {
      const pipeline = createFocusWellbeingPipeline();
      const outFocused = pipeline.run(makeInput(makeExperience({ label: 'FOCUSED', derivedAt: now }), now));
      const outBlocked = pipeline.run(makeInput(makeExperience({ label: 'BLOCKED', derivedAt: now }), now));
      const outNeutral = pipeline.run(makeInput(makeExperience({ label: 'NEUTRAL', derivedAt: now }), now));
      expect(outFocused).not.toBeNull();
      expect(outFocused!.featureType).toBe('FOCUS_GUARD');
      expect(outBlocked).not.toBeNull();
      expect(outBlocked!.featureType).toBe('WELLBEING_GATE');
      expect(outNeutral).toBeNull();
    });
  });

  describe('5. Nessuna proprietà proibita', () => {
    it('FeatureOutput non ha action, command, execute, recommendation, score, automation, learning, sideEffect', () => {
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      const input = makeInput(makeExperience({ label: 'FOCUSED', derivedAt: now }), now);
      const results = engine.run(input, makeRegistry(true));
      for (const out of results) {
        for (const key of FORBIDDEN_KEYS) {
          expect(key in out).toBe(false);
        }
      }
    });
  });

  describe('6. Nessuna dipendenza da IRIS / Execution', () => {
    it('nessun file in feature-pipelines/ importa da iris o execution', () => {
      const files = collectTsFiles(PIPELINES_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = fromMatch[1];
            if (path.includes('iris')) violations.push(file);
            if (path.includes('/execution/') || path.includes('\\execution\\')) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('7. Output immutabile', () => {
    it('run ritorna array e elementi frozen', () => {
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      const input = makeInput(makeExperience({ label: 'WAITING', derivedAt: now }), now);
      const result = engine.run(input, makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      for (const out of result) {
        expect(Object.isFrozen(out)).toBe(true);
      }
    });
  });
});

// Feature Pipelines traducono lo stato del sistema in feature visibili.
// Non decidono, non agiscono, non modificano il comportamento del sistema.
