/**
 * State Derivation — Conformance.
 * Determinism, read-only, no forbidden imports, no execution leakage, empty input → NEUTRAL.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { SemanticSignal } from '../../../iris/semantic-interpretation/SemanticSignal';
import type { DerivedStateSnapshot } from '../DerivedStateSnapshot';
import { deriveState } from '../StateDerivationEngine';

const NOW = 1704110400000;

function sig(
  id: string,
  type: SemanticSignal['type'],
  evidence: string[] = []
): SemanticSignal {
  return Object.freeze({
    id,
    type,
    detectedAt: NOW,
    sourceWindowIds: Object.freeze([]),
    evidence: Object.freeze(evidence),
  });
}

describe('State Derivation — Conformance', () => {
  describe('1. Determinismo', () => {
    it('stesso input produce stesso snapshot (deep equal, derivedAt = now)', () => {
      const signals = [sig('s1', 'FOCUS_CONTEXT')];
      const a = deriveState(signals, NOW);
      const b = deriveState(signals, NOW);
      expect(a.derivedAt).toBe(NOW);
      expect(b.derivedAt).toBe(NOW);
      expect(a.uxStates).toEqual(b.uxStates);
      expect(a.experienceCandidates).toEqual(b.experienceCandidates);
      expect(a.featureEligibility).toEqual(b.featureEligibility);
    });
  });

  describe('2. Read-only', () => {
    it('snapshot e elementi interni sono frozen', () => {
      const signals = [sig('s1', 'FOCUS_CONTEXT')];
      const out = deriveState(signals, NOW);
      expect(Object.isFrozen(out)).toBe(true);
      expect(Object.isFrozen(out.uxStates)).toBe(true);
      expect(Object.isFrozen(out.experienceCandidates)).toBe(true);
      expect(Object.isFrozen(out.featureEligibility)).toBe(true);
      for (const u of out.uxStates) {
        expect(Object.isFrozen(u)).toBe(true);
        expect(Object.isFrozen(u.derivedFrom)).toBe(true);
      }
      for (const c of out.experienceCandidates) {
        expect(Object.isFrozen(c)).toBe(true);
      }
      for (const f of out.featureEligibility) {
        expect(Object.isFrozen(f)).toBe(true);
      }
    });
  });

  describe('3. No forbidden imports', () => {
    it('state-derivation non importa da product, ux, orchestration, execution, demo, ui', () => {
      const root = join(process.cwd(), 'src', 'core', 'state-derivation');
      const forbidden = [
        'product/',
        'ux-contract',
        'ux-experience',
        'orchestration',
        'execution',
        'demo',
        'messaging-system',
      ];
      const scan = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory() && e.name !== 'tests') files.push(...scan(full));
          else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts'))
            files.push(full);
        }
        return files;
      };
      const files = scan(root);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        for (const line of lines) {
          for (const path of forbidden) {
            expect(
              line,
              `File ${file} must not import ${path}`
            ).not.toMatch(new RegExp(path.replace(/\//g, '\\/'), 'i'));
          }
        }
      }
    });
  });

  describe('4. No execution leakage', () => {
    it('nessun campo output si chiama action, execute, pipeline, trigger, command', () => {
      const out = deriveState([sig('x', 'FOCUS_CONTEXT')], NOW);
      const forbidden = ['action', 'execute', 'pipeline', 'trigger', 'command'];
      const checkObj = (obj: Record<string, unknown>) => {
        for (const key of Object.keys(obj)) {
          expect(forbidden).not.toContain(key.toLowerCase());
        }
      };
      checkObj(out as unknown as Record<string, unknown>);
      for (const u of out.uxStates) {
        checkObj(u as unknown as Record<string, unknown>);
      }
      for (const c of out.experienceCandidates) {
        checkObj(c as unknown as Record<string, unknown>);
      }
      for (const f of out.featureEligibility) {
        checkObj(f as unknown as Record<string, unknown>);
      }
    });
  });

  describe('5. Empty input', () => {
    it('semanticSignals vuoti → uxStates vuoti, experience NEUTRAL candidate', () => {
      const out = deriveState([], NOW) as DerivedStateSnapshot;
      expect(out.uxStates.length).toBe(0);
      expect(out.experienceCandidates.length).toBeGreaterThanOrEqual(1);
      const neutral = out.experienceCandidates.find((c) => c.label === 'NEUTRAL');
      expect(neutral).toBeDefined();
      expect(out.derivedAt).toBe(NOW);
    });
  });
});
