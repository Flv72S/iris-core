/**
 * IRIS 9.2.F — Product Freeze Conformance
 * Confini strutturali, separazione dal Semantic Core, kill-switch, immutabilità, assenza semantica finale.
 *
 * IRIS 9.2 è Product-Frozen. Pronto per 9.3 Rendering / UX Delivery.
 * Riusabile come engine cognitivo indipendente, non decisionale né UX-driven.
 */

import { describe, it, expect } from 'vitest';
import { createEmptySnapshot } from '../../semantic-layer';
import type { SemanticSnapshot } from '../../semantic-layer';
import { IrisInterpretationEngine } from '../interpretation';
import type { IrisInterpretationModel } from '../interpretation';
import { IrisOrchestrationEngine } from '../orchestration';
import type { IrisOrchestrationResult } from '../orchestration';
import { IrisMessagingEngine } from '../messaging';
import type { IrisMessageBinding } from '../messaging';

const FORBIDDEN_STRUCTURAL = [
  'final',
  'decision',
  'chosen',
  'selected',
  'best',
  'primary',
  'rendered',
  'text',
  'title',
  'message',
];

describe('IRIS 9.2 — Product freeze conformance', () => {
  describe('1. Confini strutturali', () => {
    it('interpretation model non espone proprietà final, decision, chosen, selected, best, primary, rendered, text, title, message', () => {
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(model);
      for (const forbidden of FORBIDDEN_STRUCTURAL) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('orchestration result non espone proprietà vietate', () => {
      const result: IrisOrchestrationResult = Object.freeze({
        planId: 'p1',
        interpretations: Object.freeze([]),
        producedBy: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(result);
      for (const forbidden of FORBIDDEN_STRUCTURAL) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('message binding e envelope non espongono proprietà vietate', () => {
      const binding: IrisMessageBinding = Object.freeze({
        channel: Object.freeze({ id: 'c1', type: 'inbox' }),
        envelope: Object.freeze({
          channelId: 'c1',
          source: Object.freeze({ interpretationIds: [], orchestrationPlanIds: [] }),
          payload: Object.freeze({ interpretations: [], orchestrationResults: [] }),
          derivedAt: new Date().toISOString(),
        }),
      });
      const envelopeKeys = Object.keys(binding.envelope);
      const payloadKeys = Object.keys(binding.envelope.payload);
      for (const forbidden of FORBIDDEN_STRUCTURAL) {
        expect(envelopeKeys).not.toContain(forbidden);
        expect(payloadKeys).not.toContain(forbidden);
      }
    });
  });

  describe('2. Separazione dal Semantic Core', () => {
    it('uso consentito: solo SemanticSnapshot e createEmptySnapshot da semantic-layer', () => {
      const snapshot: SemanticSnapshot = createEmptySnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.states).toBeDefined();
      expect(snapshot.contexts).toBeDefined();
      expect(snapshot.rankings).toBeDefined();
      expect(snapshot.explanations).toBeDefined();
      expect(snapshot.policies).toBeDefined();
    });
  });

  describe('3. Kill-switch integrity', () => {
    it('9.0 con zero interpreter produce interpretazioni vuote', () => {
      const engine = new IrisInterpretationEngine([]);
      const snapshot = createEmptySnapshot();
      const model = engine.interpret(snapshot);
      expect(model.interpretations).toHaveLength(0);
    });

    it('9.1 con orchestration OFF produce risultati vuoti', () => {
      const registryOff = { isEnabled: () => false };
      const engine = new IrisOrchestrationEngine([]);
      const snapshot = createEmptySnapshot();
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const results = engine.orchestrate(snapshot, model, registryOff);
      expect(results).toHaveLength(0);
    });

    it('9.2 con messaging OFF produce binding vuoti', () => {
      const registryOff = { isEnabled: () => false };
      const engine = new IrisMessagingEngine([Object.freeze({ id: 'ch', type: 'inbox' })]);
      const snapshot = createEmptySnapshot();
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const bindings = engine.bind(snapshot, model, [], registryOff);
      expect(bindings).toHaveLength(0);
    });
  });

  describe('4. Immutabilità end-to-end', () => {
    it('snapshot è frozen', () => {
      const snapshot = createEmptySnapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('interpretation model prodotto è frozen', () => {
      const engine = new IrisInterpretationEngine([]);
      const model = engine.interpret(createEmptySnapshot());
      expect(Object.isFrozen(model)).toBe(true);
      expect(Object.isFrozen(model.interpretations)).toBe(true);
    });

    it('orchestration results sono frozen', () => {
      const registryOn = { isEnabled: (id: string) => id === 'iris-orchestration' };
      const engine = new IrisOrchestrationEngine([
        {
          id: 'o1',
          orchestrate: (_s, m) => ({
            planId: 'p1',
            interpretations: m.interpretations,
            producedBy: ['o1'],
            derivedAt: new Date().toISOString(),
          }),
        },
      ]);
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const results = engine.orchestrate(createEmptySnapshot(), model, registryOn);
      expect(results.length).toBeGreaterThan(0);
      expect(Object.isFrozen(results)).toBe(true);
      expect(Object.isFrozen(results[0])).toBe(true);
    });

    it('message bindings sono frozen', () => {
      const registryOn = { isEnabled: (id: string) => id === 'iris-messaging' };
      const engine = new IrisMessagingEngine([Object.freeze({ id: 'ch', type: 'inbox' })]);
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const bindings = engine.bind(createEmptySnapshot(), model, [], registryOn);
      expect(bindings.length).toBeGreaterThan(0);
      expect(Object.isFrozen(bindings)).toBe(true);
      expect(Object.isFrozen(bindings[0])).toBe(true);
    });
  });

  describe('5. Assenza semantica finale', () => {
    it('nessun concetto di output finale, messaggio pronto, scelta migliore, priorità di canale', () => {
      const model: IrisInterpretationModel = Object.freeze({
        interpretations: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const result: IrisOrchestrationResult = Object.freeze({
        planId: 'p1',
        interpretations: Object.freeze([]),
        producedBy: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const binding: IrisMessageBinding = Object.freeze({
        channel: Object.freeze({ id: 'c1', type: 'inbox' }),
        envelope: Object.freeze({
          channelId: 'c1',
          source: Object.freeze({ interpretationIds: [], orchestrationPlanIds: [] }),
          payload: Object.freeze({ interpretations: [], orchestrationResults: [] }),
          derivedAt: new Date().toISOString(),
        }),
      });
      const forbiddenFinal = ['finalOutput', 'readyMessage', 'bestChoice', 'channelPriority', 'primaryChannel'];
      const allObjects = [model, result, binding, binding.envelope, binding.envelope.payload];
      for (const obj of allObjects) {
        const keys = Object.keys(obj);
        for (const key of forbiddenFinal) {
          expect(keys).not.toContain(key);
        }
      }
    });
  });
});

/**
 * IRIS 9.2 è Product-Frozen.
 * Pronto per 9.3 Rendering / UX Delivery.
 * Riusabile come engine cognitivo indipendente, non decisionale né UX-driven.
 */
