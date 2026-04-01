/**
 * UX Experience State — Conformance (C.6.5)
 * Determinismo; output singolare; snapshot vuoto → IDLE; kill-switch → NEUTRAL; no proprietà proibite; explanation non vuota; no dipendenza core.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  DefaultUxExperienceInterpreter,
  interpretUxExperience,
  UX_EXPERIENCE_COMPONENT_ID,
  type UxExperienceRegistry,
} from '../index';
import type { UxStateSnapshot } from '../../../messaging-system/ux-state/UxStateSnapshot';

const UX_EXPERIENCE_ROOT = join(process.cwd(), 'src', 'product', 'ux-experience');

const FORBIDDEN_KEYS = [
  'action',
  'command',
  'recommendation',
  'score',
  'priority',
  'automation',
  'learning',
  'feedbackEmission',
];

function makeRegistry(enabled: boolean): UxExperienceRegistry {
  return { [UX_EXPERIENCE_COMPONENT_ID]: enabled };
}

function emptySnapshot(derivedAt: number): UxStateSnapshot {
  return Object.freeze({
    states: Object.freeze([]),
    derivedAt,
  });
}

function snapshotWithStates(
  states: readonly { stateId: string; stateType: string; title: string; derivedAt: number }[],
  derivedAt: number
): UxStateSnapshot {
  return Object.freeze({
    states: Object.freeze(states.map((s) => Object.freeze(s))),
    derivedAt,
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

describe('UX Experience State — Conformance', () => {
  const now = 1704110400000;

  describe('1. Determinismo a input identico', () => {
    it('stesso input produce stesso output', () => {
      const snap = snapshotWithStates(
        [
          { stateId: 's1', stateType: 'FOCUS_ACTIVE', title: 'Focus on', derivedAt: now },
        ],
        now
      );
      const input = Object.freeze({ snapshot: snap, now });
      const a = interpretUxExperience(input);
      const b = interpretUxExperience(input);
      expect(a.label).toBe(b.label);
      expect(a.confidenceBand).toBe(b.confidenceBand);
      expect(a.explanation).toBe(b.explanation);
      expect(a.derivedAt).toBe(b.derivedAt);
    });
  });

  describe('2. Output sempre singolare', () => {
    it('interpret ritorna un solo UxExperienceState', () => {
      const snap = snapshotWithStates(
        [{ stateId: 's1', stateType: 'VOICE_READY', title: 'Voice', derivedAt: now }],
        now
      );
      const result = interpretUxExperience({ snapshot: snap, now });
      expect(result).toBeDefined();
      expect(typeof result.label).toBe('string');
      expect(typeof result.explanation).toBe('string');
      expect(Array.isArray(result.dominantSignals)).toBe(true);
    });
  });

  describe('3. Snapshot vuoto -> IDLE', () => {
    it('states vuoto produce label IDLE', () => {
      const result = interpretUxExperience({
        snapshot: emptySnapshot(now),
        now,
      });
      expect(result.label).toBe('IDLE');
      expect(result.suggestedLens).toBe('neutral');
    });
  });

  describe('4. Kill-switch OFF -> NEUTRAL', () => {
    it('con registry OFF ritorna NEUTRAL, confidenceBand low, explanation standard', () => {
      const interpreter = new DefaultUxExperienceInterpreter(makeRegistry(false));
      const snap = snapshotWithStates(
        [{ stateId: 's1', stateType: 'FOCUS_ACTIVE', title: 'Focus', derivedAt: now }],
        now
      );
      const result = interpreter.interpret({ snapshot: snap, now });
      expect(result.label).toBe('NEUTRAL');
      expect(result.confidenceBand).toBe('low');
      expect(result.suggestedLens).toBe('neutral');
      expect(result.explanation).toBe('No clear experience state available.');
    });
  });

  describe('5. Nessuna proprietà proibita', () => {
    it('UxExperienceState non ha action, command, recommendation, score, priority, automation, learning, feedbackEmission', () => {
      const result = interpretUxExperience({
        snapshot: emptySnapshot(now),
        now,
      });
      for (const key of FORBIDDEN_KEYS) {
        expect(key in result).toBe(false);
      }
    });
  });

  describe('6. Explanation non vuota', () => {
    it('ogni output ha explanation string non vuota', () => {
      const cases: UxStateSnapshot[] = [
        emptySnapshot(now),
        snapshotWithStates(
          [{ stateId: 's1', stateType: 'WELLBEING_BLOCK', title: 'Block', derivedAt: now }],
          now
        ),
      ];
      for (const snap of cases) {
        const result = interpretUxExperience({ snapshot: snap, now });
        expect(typeof result.explanation).toBe('string');
        expect(result.explanation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('7. Nessuna dipendenza dal core', () => {
    it('nessun file in ux-experience/ importa da iris o da messaging-system eccetto ux-state', () => {
      const files = collectTsFiles(UX_EXPERIENCE_ROOT);
      const violations: string[] = [];
      const allowedPath = 'messaging-system/ux-state';
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = fromMatch[1].replace(/\\/g, '/');
            if (path.includes('iris')) violations.push(file);
            if (path.includes('messaging-system') && !path.includes(allowedPath))
              violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });
});

// UX Experience State e' un layer di sintesi semantica.
// Traduce segnali UX atomici in uno stato esperienziale singolare.
// Non decide, non agisce, non modifica il comportamento del sistema.
