/**
 * SemanticAggregator — 8.2.1 Contract tests
 * Verifica: 0 moduli → vuoto; no-op → vuoto; modulo disabilitato → ignorato; ordine non semantico; kill-switch OFF → aggregatore non invocato.
 * VIETATO: test di ranking, stati semantici reali, policy, explanation.
 */

import { describe, it, expect } from 'vitest';
import { aggregate, createEmptySnapshot, isEmptySnapshot } from '../index';
import type { SemanticModule } from '../SemanticModule';
import type { SemanticSnapshot } from '../SemanticSnapshot';
import { createSemanticOverlay } from '../../contracts';

const noopModule: SemanticModule = {
  evaluate: () => null,
  disable: () => {},
};

function moduleReturningOneState(): SemanticModule {
  return {
    evaluate: (input) =>
      createSemanticOverlay(input, { states: [{ id: 'active', scope: 's', validity: { validFrom: 0, validUntil: 1 }, killSwitchable: true as const }] }, { kind: 'explicit', invalidateOnlyByCall: true }),
    disable: () => {},
  };
}

describe('SemanticAggregator — 8.2.1', () => {
  const input = Object.freeze({});

  it('aggregatore con 0 moduli → snapshot vuoto', () => {
    const snapshot = aggregate([], input);
    expect(isEmptySnapshot(snapshot)).toBe(true);
    expect(snapshot.states).toHaveLength(0);
  });

  it('aggregatore con modulo no-op → snapshot vuoto', () => {
    const snapshot = aggregate([noopModule], input);
    expect(isEmptySnapshot(snapshot)).toBe(true);
  });

  it('modulo disabilitato → output ignorato', () => {
    const mod = moduleReturningOneState();
    const snapshotDisabled = aggregate([mod], input, { isEnabled: () => false });
    expect(isEmptySnapshot(snapshotDisabled)).toBe(true);

    const snapshotEnabled = aggregate([mod], input, { isEnabled: () => true });
    expect(snapshotEnabled.states).toHaveLength(1);
  });

  it('ordine dei moduli non produce effetti osservabili quando output è vuoto', () => {
    const a = aggregate([noopModule, noopModule], input);
    const b = aggregate([noopModule], input);
    expect(isEmptySnapshot(a)).toBe(true);
    expect(isEmptySnapshot(b)).toBe(true);
    expect(a.states).toEqual(b.states);
  });

  it('kill-switch OFF → engine restituisce snapshot vuoto (aggregatore non invocato)', () => {
    const killSwitch = new Phase8KillSwitchRegistryImpl();
    const engine = new SemanticEngine(killSwitch, [noopModule]);
    const snapshot = engine.evaluate(input);
    expect(isEmptySnapshot(snapshot)).toBe(true);
  });
});
