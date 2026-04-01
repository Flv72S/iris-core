/**
 * IRIS 9.1 — Orchestration Engine conformance
 * Orchestrazione multipla, assenza selezione, kill-switch, immutabilità, assenza semantica decisionale.
 */

import { describe, it, expect } from 'vitest';
import { createEmptySnapshot } from '../../../semantic-layer';
import type { IrisInterpretationModel } from '../../interpretation';
import {
  IrisOrchestrationEngine,
  isOrchestrationEnabled,
  IRIS_ORCHESTRATION_COMPONENT_ID,
  type IrisOrchestrator,
  type OrchestrationRegistry,
} from '../index';

const FORBIDDEN_PROPERTIES = ['final', 'best', 'decision', 'chosen', 'selected', 'resultValue'];

function makeRegistry(enabled: boolean): OrchestrationRegistry {
  return {
    isEnabled: (id: string) => id === IRIS_ORCHESTRATION_COMPONENT_ID && enabled,
  };
}

function orchestratorA(): IrisOrchestrator {
  return {
    id: 'orch-a',
    orchestrate: (snapshot, model) => ({
      planId: 'plan-a',
      interpretations: [...model.interpretations],
      producedBy: ['orch-a'],
      derivedAt: new Date().toISOString(),
    }),
  };
}

function orchestratorB(): IrisOrchestrator {
  return {
    id: 'orch-b',
    orchestrate: (snapshot, model) => ({
      planId: 'plan-b',
      interpretations: [...model.interpretations],
      producedBy: ['orch-b'],
      derivedAt: new Date().toISOString(),
    }),
  };
}

const emptyInterpretationModel: IrisInterpretationModel = Object.freeze({
  interpretations: Object.freeze([]),
  derivedAt: new Date().toISOString(),
});

describe('IrisOrchestrationEngine — 9.1 conformance', () => {
  const snapshot = createEmptySnapshot();
  const registryOn = makeRegistry(true);
  const registryOff = makeRegistry(false);

  describe('orchestrazione multipla', () => {
    it('2 orchestrator → 2 risultati', () => {
      const engine = new IrisOrchestrationEngine([orchestratorA(), orchestratorB()]);
      const results = engine.orchestrate(snapshot, emptyInterpretationModel, registryOn);
      expect(results).toHaveLength(2);
      expect(results[0].planId).toBe('plan-a');
      expect(results[1].planId).toBe('plan-b');
    });
  });

  describe('nessuna selezione', () => {
    it('tutte le interpretazioni passano inalterate nei risultati', () => {
      const modelWithOne: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([
          { id: 'i1', label: 'L1', sourceStates: [] },
        ]),
        derivedAt: new Date().toISOString(),
      });
      const engine = new IrisOrchestrationEngine([orchestratorA()]);
      const results = engine.orchestrate(snapshot, modelWithOne, registryOn);
      expect(results).toHaveLength(1);
      expect(results[0].interpretations).toHaveLength(1);
      expect(results[0].interpretations[0].id).toBe('i1');
    });
  });

  describe('kill-switch', () => {
    it('OFF → risultato vuoto', () => {
      expect(isOrchestrationEnabled(registryOff)).toBe(false);
      const engine = new IrisOrchestrationEngine([orchestratorA(), orchestratorB()]);
      const results = engine.orchestrate(snapshot, emptyInterpretationModel, registryOff);
      expect(results).toHaveLength(0);
    });

    it('ON → comportamento normale', () => {
      expect(isOrchestrationEnabled(registryOn)).toBe(true);
      const engine = new IrisOrchestrationEngine([orchestratorA()]);
      const results = engine.orchestrate(snapshot, emptyInterpretationModel, registryOn);
      expect(results).toHaveLength(1);
    });
  });

  describe('immutabilità', () => {
    it('snapshot e interpretation model non mutati', () => {
      const engine = new IrisOrchestrationEngine([orchestratorA()]);
      const snapshotRef = createEmptySnapshot();
      const modelRef = emptyInterpretationModel;
      engine.orchestrate(snapshotRef, modelRef, registryOn);
      expect(Object.isFrozen(snapshotRef)).toBe(true);
      expect(Object.isFrozen(modelRef)).toBe(true);
    });

    it('risultati restituiti sono frozen', () => {
      const engine = new IrisOrchestrationEngine([orchestratorA()]);
      const results = engine.orchestrate(snapshot, emptyInterpretationModel, registryOn);
      expect(results.length).toBeGreaterThan(0);
      expect(Object.isFrozen(results)).toBe(true);
      expect(Object.isFrozen(results[0])).toBe(true);
      expect(Object.isFrozen(results[0].interpretations)).toBe(true);
    });
  });

  describe('assenza semantica decisionale', () => {
    it('nessuna proprietà final, best, decision, chosen, selected, resultValue', () => {
      const engine = new IrisOrchestrationEngine([orchestratorA()]);
      const results = engine.orchestrate(snapshot, emptyInterpretationModel, registryOn);
      expect(results).toHaveLength(1);
      const result = results[0];
      for (const key of FORBIDDEN_PROPERTIES) {
        expect(result).not.toHaveProperty(key);
      }
    });
  });
});
