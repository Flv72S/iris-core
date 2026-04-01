/**
 * IRIS 12.4 — Action Plan Snapshot (Declarative) conformance
 * Aggregazione completa; nessuna proprietà operativa; immutabilità.
 */

import { describe, it, expect } from 'vitest';
import type {
  IrisActionPlanSnapshot,
  IrisActionIntentSnapshot,
  IrisActionIntent,
} from '../index';
import type {
  IrisMessagingContractSnapshot,
  IrisMessagingContract,
  IrisContractCompatibilitySnapshot,
  IrisExecutionCapability,
  IrisCompatibilityNote,
} from '../../contract';

const FORBIDDEN_OPERATIONAL = ['execute', 'send', 'trigger', 'command', 'deliver', 'schedule'];

function createPlanSnapshot(): IrisActionPlanSnapshot {
  const intents: IrisActionIntentSnapshot = Object.freeze({
    intents: Object.freeze([
      Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd',
        derivedAt: new Date().toISOString(),
      } as IrisActionIntent),
    ]),
    derivedAt: new Date().toISOString(),
  });
  const contracts: IrisMessagingContractSnapshot = Object.freeze({
    contracts: Object.freeze([
      Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        intentType: 'notify',
        messagePurpose: 'p',
        derivedAt: new Date().toISOString(),
      } as IrisMessagingContract),
    ]),
    derivedAt: new Date().toISOString(),
  });
  const compatibility: IrisContractCompatibilitySnapshot = Object.freeze({
    contracts: Object.freeze([]),
    capabilities: Object.freeze([
      Object.freeze({
        capabilityId: 'cap-1',
        supportedIntentTypes: Object.freeze(['notify']),
      } as IrisExecutionCapability),
    ]),
    compatibilityNotes: Object.freeze([
      Object.freeze({ description: 'Notify supported.' } as IrisCompatibilityNote),
    ]),
  });
  return Object.freeze({
    intents,
    contracts,
    compatibility,
    derivedAt: new Date().toISOString(),
  });
}

describe('IRIS 12.4 — Action Plan Snapshot', () => {
  describe('1. Aggregazione completa', () => {
    it('lo snapshot contiene intents, contracts, compatibility e derivedAt', () => {
      const plan = createPlanSnapshot();
      expect(plan.intents).toBeDefined();
      expect(plan.contracts).toBeDefined();
      expect(plan.compatibility).toBeDefined();
      expect(plan.derivedAt).toBeDefined();
      expect(plan.intents.intents).toHaveLength(1);
      expect(plan.contracts.contracts).toHaveLength(1);
      expect(plan.compatibility.capabilities).toHaveLength(1);
      expect(plan.compatibility.compatibilityNotes).toHaveLength(1);
    });

    it('le quattro parti sono tipizzate correttamente', () => {
      const plan = createPlanSnapshot();
      expect(plan.intents.derivedAt).toBeDefined();
      expect(plan.contracts.derivedAt).toBeDefined();
      expect(plan.intents.intents[0].intentType).toBe('notify');
      expect(plan.contracts.contracts[0].messagePurpose).toBe('p');
      expect(plan.compatibility.compatibilityNotes[0].description).toBe('Notify supported.');
    });
  });

  describe('2. Nessuna proprietà operativa', () => {
    it('IrisActionPlanSnapshot non espone execute, send, trigger, command, deliver, schedule', () => {
      const plan = createPlanSnapshot();
      const keys = Object.keys(plan);
      for (const forbidden of FORBIDDEN_OPERATIONAL) {
        expect(keys).not.toContain(forbidden);
      }
    });
  });

  describe('3. Immutabilità', () => {
    it('lo snapshot completo è frozen', () => {
      const plan = createPlanSnapshot();
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it('intents, contracts e compatibility sono frozen', () => {
      const plan = createPlanSnapshot();
      expect(Object.isFrozen(plan.intents)).toBe(true);
      expect(Object.isFrozen(plan.intents.intents)).toBe(true);
      expect(Object.isFrozen(plan.contracts)).toBe(true);
      expect(Object.isFrozen(plan.contracts.contracts)).toBe(true);
      expect(Object.isFrozen(plan.compatibility)).toBe(true);
      expect(Object.isFrozen(plan.compatibility.capabilities)).toBe(true);
      expect(Object.isFrozen(plan.compatibility.compatibilityNotes)).toBe(true);
    });
  });
});
