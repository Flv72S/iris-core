/**
 * Ranking & OrderedView — 8.2.2
 * Verifica: assenza ranking → ordine originale; ranking dichiarato → ordine esplicito;
 * determinismo; nessuna selezione; kill-switch OFF → nessun ordinamento.
 * VIETATO: decisioni, conflitti, policy, UX.
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptySnapshot,
  createOrderedView,
  aggregate,
  SemanticEngine,
  SEMANTIC_ENGINE_COMPONENT_ID,
  SEMANTIC_RANKING_COMPONENT_ID,
} from '../index';
import { Phase8KillSwitchRegistryImpl } from '../../kill-switch/Phase8KillSwitchRegistryImpl';
import { createSemanticOverlay } from '../../contracts';
import type { SemanticModule } from '../SemanticModule';
import type { RankableSemanticState } from '../Ranking';

const v = (from: number, to: number) => ({ validFrom: from, validUntil: to });

function state(id: string, rank?: number, priority?: number, weight?: number): RankableSemanticState {
  return {
    id: 'active',
    scope: id,
    validity: v(0, 1),
    killSwitchable: true as const,
    ...(rank !== undefined && { rank }),
    ...(priority !== undefined && { priority }),
    ...(weight !== undefined && { weight }),
  };
}

describe('8.2.2 Ranking & OrderedView', () => {
  describe('contributi senza ranking → ordine originale', () => {
    it('snapshot senza rank resta in ordine di arrivo', () => {
      const s1 = state('a');
      const s2 = state('b');
      const mod: SemanticModule = {
        evaluate: (input) =>
          createSemanticOverlay(input, { states: [s1, s2] }, { kind: 'explicit', invalidateOnlyByCall: true }),
        disable: () => {},
      };
      const snap = aggregate([mod], Object.freeze({}));
      expect(snap.states.length).toBe(2);
      expect((snap.states[0] as RankableSemanticState).scope).toBe('a');
      expect((snap.states[1] as RankableSemanticState).scope).toBe('b');
    });

    it('createOrderedView su elementi senza rank non cambia ordine (stabile)', () => {
      const snap = Object.freeze({
        ...createEmptySnapshot(),
        states: Object.freeze([state('x'), state('y')]),
      });
      const ordered = createOrderedView(snap, { orderBy: 'rank', direction: 'Asc' });
      expect(ordered.states[0]).toBe(snap.states[0]);
      expect(ordered.states[1]).toBe(snap.states[1]);
    });
  });

  describe('presenza di ranking dichiarato → elementi ordinati', () => {
    it('ordine per rank ascendente (minore prima)', () => {
      const snap = Object.freeze({
        ...createEmptySnapshot(),
        states: Object.freeze([state('a', 10), state('b', 1), state('c', 5)]),
      });
      const ordered = createOrderedView(snap, { orderBy: 'rank', direction: 'Asc' });
      expect((ordered.states[0] as RankableSemanticState).scope).toBe('b');
      expect((ordered.states[1] as RankableSemanticState).scope).toBe('c');
      expect((ordered.states[2] as RankableSemanticState).scope).toBe('a');
    });

    it('ordine per priority (maggiore prima con Asc)', () => {
      const snap = Object.freeze({
        ...createEmptySnapshot(),
        states: Object.freeze([state('lo', undefined, 1), state('hi', undefined, 10)]),
      });
      const ordered = createOrderedView(snap, { orderBy: 'priority', direction: 'Asc' });
      expect((ordered.states[0] as RankableSemanticState).scope).toBe('hi');
      expect((ordered.states[1] as RankableSemanticState).scope).toBe('lo');
    });
  });

  describe('determinismo', () => {
    it('stesso input → stesso ordine', () => {
      const snap = Object.freeze({
        ...createEmptySnapshot(),
        states: Object.freeze([state('a', 3), state('b', 1), state('c', 2)]),
      });
      const opts = { orderBy: 'rank' as const, direction: 'Asc' as const };
      const o1 = createOrderedView(snap, opts);
      const o2 = createOrderedView(snap, opts);
      expect(o1.states.map((s) => (s as RankableSemanticState).scope)).toEqual(o2.states.map((s) => (s as RankableSemanticState).scope));
    });
  });

  describe('nessuna selezione', () => {
    it('tutti gli elementi restano presenti', () => {
      const snap = Object.freeze({
        ...createEmptySnapshot(),
        states: Object.freeze([state('a', 1), state('b', 2), state('c', 3)]),
      });
      const ordered = createOrderedView(snap, { orderBy: 'rank', direction: 'Asc' });
      expect(ordered.states.length).toBe(3);
      expect(ordered.states.map((s) => (s as RankableSemanticState).scope).sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('kill-switch OFF → nessun ordinamento', () => {
    it('ranking disabilitato: engine restituisce ordine 8.2.1 (aggregazione)', () => {
      const reg = new Phase8KillSwitchRegistryImpl([SEMANTIC_ENGINE_COMPONENT_ID]);
      expect(reg.isEnabled(SEMANTIC_RANKING_COMPONENT_ID)).toBe(false);
      const mod: SemanticModule = {
        evaluate: (input) =>
          createSemanticOverlay(
            input,
            { states: [state('z', 1), state('a', 10)] },
            { kind: 'explicit', invalidateOnlyByCall: true }
          ),
        disable: () => {},
      };
      const engine = new SemanticEngine(reg, [mod]);
      const snap = engine.evaluate(Object.freeze({}));
      expect(snap.states.length).toBe(2);
      expect((snap.states[0] as RankableSemanticState).scope).toBe('z');
      expect((snap.states[1] as RankableSemanticState).scope).toBe('a');
    });

    it('ranking abilitato: engine restituisce ordine per rank', () => {
      const reg = new Phase8KillSwitchRegistryImpl([SEMANTIC_ENGINE_COMPONENT_ID, SEMANTIC_RANKING_COMPONENT_ID]);
      const mod: SemanticModule = {
        evaluate: (input) =>
          createSemanticOverlay(
            input,
            { states: [state('z', 1), state('a', 10)] },
            { kind: 'explicit', invalidateOnlyByCall: true }
          ),
        disable: () => {},
      };
      const engine = new SemanticEngine(reg, [mod]);
      const snap = engine.evaluate(Object.freeze({}));
      expect(snap.states.length).toBe(2);
      expect((snap.states[0] as RankableSemanticState).scope).toBe('z');
      expect((snap.states[1] as RankableSemanticState).scope).toBe('a');
    });
  });
});
