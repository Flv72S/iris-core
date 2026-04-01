/**
 * Feature Orchestration — Conformance C.8 + C.9 light
 * DEFAULT inalterato; FOCUS riduce Smart Inbox; WELLBEING nasconde non-wellbeing; kill-switch; determinismo; immutabile; no proprietà proibite; no IRIS/Messaging.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { FeatureOutput } from '../../feature-pipelines';
import type { UxExperienceState } from '../../ux-experience/UxExperienceState';
import {
  DefaultFeatureOrchestrator,
  applyProductMode,
  FEATURE_ORCHESTRATOR_COMPONENT_ID,
  type FeatureOrchestrationInput,
  type FeatureOrchestratorRegistry,
} from '../index';

const ORCHESTRATION_ROOT = join(process.cwd(), 'src', 'product', 'orchestration');

const FORBIDDEN_KEYS = [
  'action',
  'command',
  'recommendation',
  'score',
  'automation',
  'learning',
  'feedback',
];

function makeRegistry(enabled: boolean): FeatureOrchestratorRegistry {
  return { [FEATURE_ORCHESTRATOR_COMPONENT_ID]: enabled };
}

function makeFeature(
  featureId: string,
  featureType: FeatureOutput['featureType'],
  visibility: FeatureOutput['visibility'],
  priority: FeatureOutput['priority'],
  derivedAt: number
): FeatureOutput {
  return Object.freeze({
    featureId,
    featureType,
    title: featureId,
    visibility,
    priority,
    explanation: 'Test',
    derivedAt,
  });
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

describe('Feature Orchestration — Conformance (C.8 + C.9 light)', () => {
  const now = 1704110400000;

  describe('1. DEFAULT mode non modifica feature', () => {
    it('visibility e priority restano quelli originali, appliedMode = DEFAULT', () => {
      const feature = makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'high', now);
      const experience = makeExperience({ derivedAt: now });
      const out = applyProductMode(feature, 'DEFAULT', experience);
      expect(out.visibility).toBe('visible');
      expect(out.priority).toBe('high');
      expect(out.appliedMode).toBe('DEFAULT');
      expect(out.featureType).toBe('SMART_INBOX');
    });
  });

  describe('2. FOCUS mode riduce Smart Inbox', () => {
    it('SMART_INBOX con visibility visible diventa reduced', () => {
      const feature = makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'normal', now);
      const experience = makeExperience({ label: 'FOCUSED', derivedAt: now });
      const out = applyProductMode(feature, 'FOCUS', experience);
      expect(out.visibility).toBe('reduced');
      expect(out.appliedMode).toBe('FOCUS');
    });
    it('FOCUS_GUARD resta visible', () => {
      const feature = makeFeature('focus-guard', 'FOCUS_GUARD', 'visible', 'normal', now);
      const experience = makeExperience({ derivedAt: now });
      const out = applyProductMode(feature, 'FOCUS', experience);
      expect(out.visibility).toBe('visible');
    });
  });

  describe('3. WELLBEING mode nasconde feature non wellbeing', () => {
    it('WELLBEING_GATE resta visible, altre feature diventano hidden', () => {
      const wellbeing = makeFeature('wellbeing-gate', 'WELLBEING_GATE', 'visible', 'normal', now);
      const focusGuard = makeFeature('focus-guard', 'FOCUS_GUARD', 'visible', 'normal', now);
      const experience = makeExperience({ label: 'BLOCKED', derivedAt: now });
      const outW = applyProductMode(wellbeing, 'WELLBEING', experience);
      const outF = applyProductMode(focusGuard, 'WELLBEING', experience);
      expect(outW.visibility).toBe('visible');
      expect(outF.visibility).toBe('hidden');
    });
    it('SMART_INBOX in WELLBEING diventa al massimo reduced', () => {
      const feature = makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'normal', now);
      const experience = makeExperience({ derivedAt: now });
      const out = applyProductMode(feature, 'WELLBEING', experience);
      expect(out.visibility).toBe('reduced');
    });
  });

  describe('4. Kill-switch OFF -> output vuoto', () => {
    it('orchestrate con registry OFF ritorna []', () => {
      const orchestrator = new DefaultFeatureOrchestrator(makeRegistry(false));
      const input: FeatureOrchestrationInput = Object.freeze({
        features: Object.freeze([
          makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'normal', now),
        ]),
        experience: makeExperience({ derivedAt: now }),
        mode: 'DEFAULT',
        now,
      });
      const result = orchestrator.orchestrate(input);
      expect(result).toEqual([]);
    });
  });

  describe('5. Determinismo', () => {
    it('stesso input produce stesso output', () => {
      const input: FeatureOrchestrationInput = Object.freeze({
        features: Object.freeze([
          makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'normal', now),
        ]),
        experience: makeExperience({ label: 'FOCUSED', derivedAt: now }),
        mode: 'FOCUS',
        now,
      });
      const orchestrator = new DefaultFeatureOrchestrator(makeRegistry(true));
      const a = orchestrator.orchestrate(input);
      const b = orchestrator.orchestrate(input);
      expect(a.length).toBe(b.length);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });

  describe('6. Output immutabile', () => {
    it('orchestrate ritorna array e elementi frozen', () => {
      const orchestrator = new DefaultFeatureOrchestrator(makeRegistry(true));
      const input: FeatureOrchestrationInput = Object.freeze({
        features: Object.freeze([
          makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'normal', now),
        ]),
        experience: makeExperience({ derivedAt: now }),
        mode: 'DEFAULT',
        now,
      });
      const result = orchestrator.orchestrate(input);
      expect(Object.isFrozen(result)).toBe(true);
      for (const f of result) {
        expect(Object.isFrozen(f)).toBe(true);
      }
    });
  });

  describe('7. Nessuna proprietà proibita', () => {
    it('OrchestratedFeature non ha action, command, recommendation, score, automation, learning, feedback', () => {
      const feature = makeFeature('smart-inbox', 'SMART_INBOX', 'visible', 'normal', now);
      const out = applyProductMode(feature, 'DEFAULT', makeExperience({ derivedAt: now }));
      for (const key of FORBIDDEN_KEYS) {
        expect(key in out).toBe(false);
      }
    });
  });

  describe('8. Nessuna dipendenza da IRIS / Messaging', () => {
    it('nessun file in orchestration/ importa da iris o messaging-system', () => {
      const files = collectTsFiles(ORCHESTRATION_ROOT);
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

// Feature Orchestrator coordina la presentazione delle feature.
// Non prende decisioni, non esegue azioni, non modifica il sistema.
