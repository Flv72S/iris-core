/**
 * SemanticEngine — 8.2.0 Skeleton tests
 * Verifica: kill-switch OFF → snapshot vuoto; senza moduli → snapshot vuoto; comportamento neutro.
 * NESSUN test di comportamento semantico.
 */

import { describe, it, expect } from 'vitest';
import { SemanticEngine } from '../SemanticEngine';
import { createEmptySnapshot, isEmptySnapshot } from '../SemanticSnapshot';
import { Phase8KillSwitchRegistryImpl } from '../../kill-switch/Phase8KillSwitchRegistryImpl';
import { SEMANTIC_ENGINE_COMPONENT_ID } from '../SemanticKillSwitch';

describe('SemanticEngine — 8.2.0 skeleton', () => {
  it('con kill-switch OFF restituisce sempre snapshot vuoto', () => {
    const killSwitch = new Phase8KillSwitchRegistryImpl();
    expect(killSwitch.isEnabled(SEMANTIC_ENGINE_COMPONENT_ID)).toBe(false);

    const engine = new SemanticEngine(killSwitch);
    const input = Object.freeze({ id: '1', title: 'x' });
    const snapshot = engine.evaluate(input);

    expect(isEmptySnapshot(snapshot)).toBe(true);
    expect(snapshot.states).toHaveLength(0);
    expect(snapshot.contexts).toHaveLength(0);
    expect(snapshot.rankings).toHaveLength(0);
    expect(snapshot.explanations).toHaveLength(0);
    expect(snapshot.policies).toHaveLength(0);
  });

  it('con kill-switch ON ma senza moduli restituisce snapshot vuoto', () => {
    const killSwitch = new Phase8KillSwitchRegistryImpl([SEMANTIC_ENGINE_COMPONENT_ID]);
    const engine = new SemanticEngine(killSwitch);
    const snapshot = engine.evaluate(Object.freeze({}));

    expect(isEmptySnapshot(snapshot)).toBe(true);
  });

  it('con kill-switch ON e moduli (skeleton) restituisce comunque snapshot vuoto', () => {
    const killSwitch = new Phase8KillSwitchRegistryImpl([SEMANTIC_ENGINE_COMPONENT_ID]);
    const noopModule = {
      evaluate: () => null,
      disable: () => {},
    };
    const engine = new SemanticEngine(killSwitch, [noopModule]);
    const snapshot = engine.evaluate(Object.freeze({}));

    expect(isEmptySnapshot(snapshot)).toBe(true);
  });

  it('createEmptySnapshot è identico a output engine in tutti i casi', () => {
    const empty = createEmptySnapshot();
    const killSwitch = new Phase8KillSwitchRegistryImpl();
    const engine = new SemanticEngine(killSwitch);
    const fromEngine = engine.evaluate(Object.freeze({}));

    expect(empty.states).toEqual(fromEngine.states);
    expect(empty.contexts).toEqual(fromEngine.contexts);
    expect(empty.rankings).toEqual(fromEngine.rankings);
    expect(empty.explanations).toEqual(fromEngine.explanations);
    expect(empty.policies).toEqual(fromEngine.policies);
  });
});
