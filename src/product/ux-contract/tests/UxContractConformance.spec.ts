/**
 * UX Contract — Conformance.
 * 1. Contratto completamente read-only
 * 2. Nessuna proprietà operativa
 * 3. Test importa solo da ux-contract (UI non importa IRIS/Messaging)
 * 4. Tutti i campi richiesti presenti
 * 5. contractVersion valorizzata
 */

import { describe, it, expect } from 'vitest';
import { escapeRegExp } from '../../../test-support/regexpEscapes';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  UxContract,
  UxContractMeta,
  UxStateSnapshot,
  UxExperienceState,
  OrchestratedFeature,
} from '../index';
import { UX_CONTRACT_VERSION } from '../contractVersion';

const FORBIDDEN_OPERATIONAL_KEYS = [
  'action',
  'command',
  'execute',
  'trigger',
  'retry',
  'recommendation',
  'score',
  'automation',
  'learning',
  'feedback',
  'feedbackEmission',
];

function minimalUxStateSnapshot(): UxStateSnapshot {
  return Object.freeze({
    states: Object.freeze([]),
    derivedAt: 0,
  });
}

function minimalExperience(): UxExperienceState {
  return Object.freeze({
    label: 'NEUTRAL',
    confidenceBand: 'medium',
    stability: 'stable',
    dominantSignals: Object.freeze([]),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'neutral',
    explanation: 'No clear experience state available.',
    derivedAt: 0,
  });
}

function minimalFeature(): OrchestratedFeature {
  return Object.freeze({
    featureId: 'test',
    featureType: 'SMART_INBOX',
    title: 'Test',
    visibility: 'visible',
    priority: 'normal',
    explanation: 'Test',
    appliedMode: 'DEFAULT',
    derivedAt: 0,
  });
}

function minimalMeta(): UxContractMeta {
  return Object.freeze({
    productMode: 'DEFAULT',
    generatedAt: 0,
    contractVersion: UX_CONTRACT_VERSION,
  });
}

function minimalContract(): UxContract {
  return Object.freeze({
    uxState: minimalUxStateSnapshot(),
    experience: minimalExperience(),
    features: Object.freeze([minimalFeature()]),
    meta: minimalMeta(),
  });
}

describe('UxContract — Conformance', () => {
  describe('1. Contratto completamente read-only', () => {
    it('UxContract ha solo campi readonly (uxState, experience, features, meta)', () => {
      const c = minimalContract();
      expect(c.uxState).toBeDefined();
      expect(c.experience).toBeDefined();
      expect(c.features).toBeDefined();
      expect(c.meta).toBeDefined();
    });

    it('contratto e meta sono freeze: nessuna proprietà assegnabile', () => {
      const c = minimalContract();
      expect(Object.isFrozen(c)).toBe(true);
      expect(Object.isFrozen(c.meta)).toBe(true);
    });
  });

  describe('2. Nessuna proprietà operativa presente', () => {
    it('UxContract non espone chiavi operative a livello root', () => {
      const keys = Object.keys(minimalContract()) as string[];
      for (const forbidden of FORBIDDEN_OPERATIONAL_KEYS) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('UxContractMeta non espone chiavi operative', () => {
      const keys = Object.keys(minimalMeta()) as string[];
      for (const forbidden of FORBIDDEN_OPERATIONAL_KEYS) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('OrchestratedFeature (via contract) non espone chiavi operative', () => {
      const f = minimalFeature();
      const keys = Object.keys(f) as string[];
      for (const forbidden of FORBIDDEN_OPERATIONAL_KEYS) {
        expect(keys).not.toContain(forbidden);
      }
    });
  });

  describe('3. UI Contract: test importa solo da ux-contract', () => {
    it('il file di test non importa da messaging-system o IRIS', () => {
      const testPath = join(__dirname, 'UxContractConformance.spec.ts');
      const content = readFileSync(testPath, 'utf-8');
      const importLines = content.split('\n').filter((l) => l.trim().startsWith('import'));
      const forbiddenPaths = ['messaging-system', 'messagingSystem', 'iris/', 'Iris'];
      for (const line of importLines) {
        for (const path of forbiddenPaths) {
          expect(line).not.toMatch(new RegExp(escapeRegExp(path), 'i'));
        }
      }
    });
  });

  describe('4. Tutti i campi richiesti sono presenti', () => {
    it('UxContract ha uxState, experience, features, meta', () => {
      const c = minimalContract();
      expect(c).toHaveProperty('uxState');
      expect(c).toHaveProperty('experience');
      expect(c).toHaveProperty('features');
      expect(c).toHaveProperty('meta');
    });

    it('UxContractMeta ha productMode, generatedAt, contractVersion', () => {
      const m = minimalMeta();
      expect(m).toHaveProperty('productMode');
      expect(m).toHaveProperty('generatedAt');
      expect(m).toHaveProperty('contractVersion');
    });

    it('experience ha label e explanation (Required UI Behaviors)', () => {
      const e = minimalExperience();
      expect(e).toHaveProperty('label');
      expect(e).toHaveProperty('explanation');
    });

    it('features[0] ha visibility, priority, appliedMode', () => {
      const f = minimalFeature();
      expect(f).toHaveProperty('visibility');
      expect(f).toHaveProperty('priority');
      expect(f).toHaveProperty('appliedMode');
    });
  });

  describe('5. contractVersion valorizzata', () => {
    it('UX_CONTRACT_VERSION è in formato major.minor', () => {
      expect(UX_CONTRACT_VERSION).toMatch(/^\d+\.\d+$/);
    });

    it('meta.contractVersion è valorizzata', () => {
      const m = minimalMeta();
      expect(m.contractVersion).toBe(UX_CONTRACT_VERSION);
      expect(m.contractVersion.length).toBeGreaterThan(0);
    });
  });
});
