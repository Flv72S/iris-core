/**
 * IRIS 9.2 — Messaging Engine conformance
 * Binding multi-canale, completezza, kill-switch, immutabilità, assenza UX e decisione.
 */

import { describe, it, expect } from 'vitest';
import { createEmptySnapshot } from '../../../semantic-layer';
import type { IrisInterpretationModel } from '../../interpretation';
import type { IrisOrchestrationResult } from '../../orchestration';
import {
  IrisMessagingEngine,
  isMessagingEnabled,
  IRIS_MESSAGING_COMPONENT_ID,
  type IrisChannel,
  type MessagingRegistry,
} from '../index';

const FORBIDDEN_UX = ['text', 'title', 'message', 'content', 'rendered'];
const FORBIDDEN_DECISION = ['final', 'best', 'chosen', 'primaryChannel'];

function makeRegistry(enabled: boolean): MessagingRegistry {
  return {
    isEnabled: (id: string) => id === IRIS_MESSAGING_COMPONENT_ID && enabled,
  };
}

const channelA: IrisChannel = Object.freeze({ id: 'ch-a', type: 'inbox' });
const channelB: IrisChannel = Object.freeze({ id: 'ch-b', type: 'email' });

const emptyModel: IrisInterpretationModel = Object.freeze({
  interpretations: Object.freeze([]),
  derivedAt: new Date().toISOString(),
});

const oneInterpretationModel: IrisInterpretationModel = Object.freeze({
  interpretations: Object.freeze([
    { id: 'i1', label: 'L1', sourceStates: [] },
  ]),
  derivedAt: new Date().toISOString(),
});

const oneOrchestrationResult: IrisOrchestrationResult = Object.freeze({
  planId: 'plan-1',
  interpretations: Object.freeze([]),
  producedBy: Object.freeze(['orch-1']),
  derivedAt: new Date().toISOString(),
});

describe('IrisMessagingEngine — 9.2 conformance', () => {
  const snapshot = createEmptySnapshot();
  const registryOn = makeRegistry(true);
  const registryOff = makeRegistry(false);

  describe('binding multi-canale', () => {
    it('2 canali → 2 binding', () => {
      const engine = new IrisMessagingEngine([channelA, channelB]);
      const bindings = engine.bind(snapshot, emptyModel, [], registryOn);
      expect(bindings).toHaveLength(2);
      expect(bindings[0].channel.id).toBe('ch-a');
      expect(bindings[1].channel.id).toBe('ch-b');
    });
  });

  describe('completezza', () => {
    it('ogni envelope contiene tutte le interpretazioni e orchestrationResults', () => {
      const engine = new IrisMessagingEngine([channelA]);
      const bindings = engine.bind(
        snapshot,
        oneInterpretationModel,
        [oneOrchestrationResult],
        registryOn
      );
      expect(bindings).toHaveLength(1);
      const envelope = bindings[0].envelope;
      expect(envelope.payload.interpretations).toHaveLength(1);
      expect(envelope.payload.interpretations[0].id).toBe('i1');
      expect(envelope.payload.orchestrationResults).toHaveLength(1);
      expect(envelope.payload.orchestrationResults[0].planId).toBe('plan-1');
      expect(envelope.source.interpretationIds).toEqual(['i1']);
      expect(envelope.source.orchestrationPlanIds).toEqual(['plan-1']);
    });
  });

  describe('kill-switch', () => {
    it('OFF → []', () => {
      expect(isMessagingEnabled(registryOff)).toBe(false);
      const engine = new IrisMessagingEngine([channelA, channelB]);
      const bindings = engine.bind(snapshot, emptyModel, [], registryOff);
      expect(bindings).toHaveLength(0);
    });

    it('ON → binding presenti', () => {
      expect(isMessagingEnabled(registryOn)).toBe(true);
      const engine = new IrisMessagingEngine([channelA]);
      const bindings = engine.bind(snapshot, emptyModel, [], registryOn);
      expect(bindings).toHaveLength(1);
    });
  });

  describe('immutabilità', () => {
    it('snapshot, model, results non mutati', () => {
      const engine = new IrisMessagingEngine([channelA]);
      const snapshotRef = createEmptySnapshot();
      const modelRef = emptyModel;
      const resultsRef: readonly IrisOrchestrationResult[] = Object.freeze([]);
      engine.bind(snapshotRef, modelRef, resultsRef, registryOn);
      expect(Object.isFrozen(snapshotRef)).toBe(true);
      expect(Object.isFrozen(modelRef)).toBe(true);
    });

    it('binding ed envelope frozen', () => {
      const engine = new IrisMessagingEngine([channelA]);
      const bindings = engine.bind(snapshot, emptyModel, [], registryOn);
      expect(bindings).toHaveLength(1);
      expect(Object.isFrozen(bindings)).toBe(true);
      expect(Object.isFrozen(bindings[0])).toBe(true);
      expect(Object.isFrozen(bindings[0].envelope)).toBe(true);
      expect(Object.isFrozen(bindings[0].envelope.payload)).toBe(true);
    });
  });

  describe('assenza UX', () => {
    it('nessuna proprietà text, title, message, content, rendered', () => {
      const engine = new IrisMessagingEngine([channelA]);
      const bindings = engine.bind(snapshot, emptyModel, [], registryOn);
      const envelope = bindings[0].envelope;
      for (const key of FORBIDDEN_UX) {
        expect(envelope).not.toHaveProperty(key);
        expect((envelope as Record<string, unknown>).payload).not.toHaveProperty(key);
      }
    });
  });

  describe('assenza decisione', () => {
    it('nessuna proprietà final, best, chosen, primaryChannel', () => {
      const engine = new IrisMessagingEngine([channelA]);
      const bindings = engine.bind(snapshot, emptyModel, [], registryOn);
      const binding = bindings[0];
      for (const key of FORBIDDEN_DECISION) {
        expect(binding).not.toHaveProperty(key);
        expect(binding.envelope).not.toHaveProperty(key);
      }
    });
  });
});
