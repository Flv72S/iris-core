/**
 * 8.2.F — Semantic Engine Core Freeze & Conformance
 * Test di conformità strutturale: forma snapshot, degradazione, immutabilità, assenza semantica finale.
 * NON testano contenuti semantici, UX, policy o decisioni.
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptySnapshot,
  SemanticEngine,
  SEMANTIC_ENGINE_COMPONENT_ID,
  SEMANTIC_RANKING_COMPONENT_ID,
  SEMANTIC_EXPLANATIONS_COMPONENT_ID,
} from '../index';
import { Phase8KillSwitchRegistryImpl } from '../../kill-switch/Phase8KillSwitchRegistryImpl';
import type { SemanticSnapshot } from '../SemanticSnapshot';

const ALLOWED_SNAPSHOT_KEYS = ['states', 'contexts', 'rankings', 'explanations', 'policies'] as const;
const FORBIDDEN_SNAPSHOT_KEYS = ['view', 'projection', 'final', 'decision', 'result', 'chosen', 'selected'];

describe('8.2.F — Core freeze conformance', () => {
  describe('forma dello snapshot', () => {
    it('le uniche chiavi ammesse sono states, contexts, rankings, explanations, policies', () => {
      const snapshot = createEmptySnapshot();
      const keys = Object.keys(snapshot).sort();
      expect(keys).toEqual([...ALLOWED_SNAPSHOT_KEYS].sort());
    });

    it('nessuna chiave view, projection, final, decision, result', () => {
      const snapshot = createEmptySnapshot();
      for (const key of FORBIDDEN_SNAPSHOT_KEYS) {
        expect(snapshot).not.toHaveProperty(key);
      }
    });

    it('ogni chiave ammessa è presente e è un array', () => {
      const snapshot = createEmptySnapshot();
      for (const key of ALLOWED_SNAPSHOT_KEYS) {
        expect(snapshot).toHaveProperty(key);
        expect(Array.isArray((snapshot as Record<string, unknown>)[key])).toBe(true);
      }
    });
  });

  describe('degradazione completa', () => {
    it('tutti i kill-switch OFF → snapshot vuoto (equivalente a nessun overlay)', () => {
      const registry = new Phase8KillSwitchRegistryImpl();
      expect(registry.isEnabled(SEMANTIC_ENGINE_COMPONENT_ID)).toBe(false);
      expect(registry.isEnabled(SEMANTIC_RANKING_COMPONENT_ID)).toBe(false);
      expect(registry.isEnabled(SEMANTIC_EXPLANATIONS_COMPONENT_ID)).toBe(false);

      const engine = new SemanticEngine(registry, []);
      const snapshot = engine.evaluate(Object.freeze({}));

      const empty = createEmptySnapshot();
      expect(snapshot.states).toEqual(empty.states);
      expect(snapshot.contexts).toEqual(empty.contexts);
      expect(snapshot.rankings).toEqual(empty.rankings);
      expect(snapshot.explanations).toEqual(empty.explanations);
      expect(snapshot.policies).toEqual(empty.policies);
    });
  });

  describe('immutabilità', () => {
    it('lo snapshot restituito è frozen o con proprietà read-only', () => {
      const snapshot = createEmptySnapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('gli array interni (states, contexts, etc.) sono frozen o non estensibili', () => {
      const snapshot = createEmptySnapshot();
      expect(Object.isFrozen(snapshot.states)).toBe(true);
      expect(Object.isFrozen(snapshot.contexts)).toBe(true);
      expect(Object.isFrozen(snapshot.rankings)).toBe(true);
      expect(Object.isFrozen(snapshot.explanations)).toBe(true);
      expect(Object.isFrozen(snapshot.policies)).toBe(true);
    });

    it('snapshot da engine con tutti OFF è frozen', () => {
      const registry = new Phase8KillSwitchRegistryImpl();
      const engine = new SemanticEngine(registry, []);
      const snapshot = engine.evaluate(Object.freeze({}));
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe('assenza di semantica finale', () => {
    it('lo snapshot non espone proprietà o metodi di scelta, decisione o finalizzazione', () => {
      const snapshot = createEmptySnapshot();
      const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(snapshot));
      const forbidden = ['final', 'decision', 'result', 'chosen', 'select', 'choose', 'getFinal', 'getDecision'];
      for (const name of forbidden) {
        expect(proto).not.toContain(name);
        expect(snapshot).not.toHaveProperty(name);
      }
    });

    it('lo snapshot è un plain object con sole chiavi ammesse (nessun metodo di istanza)', () => {
      const snapshot = createEmptySnapshot();
      const keys = Object.keys(snapshot);
      expect(keys.length).toBe(5);
      expect(keys.every((k) => ALLOWED_SNAPSHOT_KEYS.includes(k as (typeof ALLOWED_SNAPSHOT_KEYS)[number]))).toBe(true);
    });
  });
});
