/**
 * IRIS 12.3 — Capability Declaration & Compatibility conformance
 * Compatibilità descrittiva; nessuna selezione; nessun side-effect.
 */

import { describe, it, expect } from 'vitest';
import type {
  IrisMessagingContract,
  IrisExecutionCapability,
  IrisContractCompatibilitySnapshot,
  IrisCompatibilityNote,
} from '../index';

const FORBIDDEN_KEYS = ['select', 'filter', 'execute', 'choose', 'recommend'];

function snapshotKeys(obj: object): string[] {
  return Object.keys(obj);
}

describe('IRIS 12.3 — Capability Declaration & Compatibility', () => {
  describe('1. Compatibilità descrittiva', () => {
    it('IrisExecutionCapability dichiara supportedIntentTypes e capabilityId', () => {
      const cap: IrisExecutionCapability = Object.freeze({
        capabilityId: 'cap-1',
        supportedIntentTypes: Object.freeze(['notify', 'request']),
      });
      expect(cap.capabilityId).toBe('cap-1');
      expect(cap.supportedIntentTypes).toContain('notify');
      expect(cap.supportedIntentTypes).toContain('request');
    });

    it('IrisContractCompatibilitySnapshot espone contracts, capabilities e compatibilityNotes descrittive', () => {
      const contract: IrisMessagingContract = Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        intentType: 'notify',
        messagePurpose: 'p',
        derivedAt: new Date().toISOString(),
      });
      const capability: IrisExecutionCapability = Object.freeze({
        capabilityId: 'cap-1',
        supportedIntentTypes: Object.freeze(['notify']),
      });
      const note: IrisCompatibilityNote = Object.freeze({
        description: 'Contract c1 intent type notify is supported by capability cap-1.',
      });
      const snapshot: IrisContractCompatibilitySnapshot = Object.freeze({
        contracts: Object.freeze([contract]),
        capabilities: Object.freeze([capability]),
        compatibilityNotes: Object.freeze([note]),
      });
      expect(snapshot.contracts).toHaveLength(1);
      expect(snapshot.capabilities).toHaveLength(1);
      expect(snapshot.compatibilityNotes).toHaveLength(1);
      expect(snapshot.compatibilityNotes[0].description).toBe(
        'Contract c1 intent type notify is supported by capability cap-1.'
      );
    });

    it('compatibilityNotes sono solo descrittive (description)', () => {
      const note: IrisCompatibilityNote = Object.freeze({
        description: 'Descriptive note only.',
      });
      expect(snapshotKeys(note)).toEqual(['description']);
    });
  });

  describe('2. Nessuna selezione', () => {
    it('IrisContractCompatibilitySnapshot non contiene select, filter, choose, recommend', () => {
      const snapshot: IrisContractCompatibilitySnapshot = Object.freeze({
        contracts: Object.freeze([]),
        capabilities: Object.freeze([]),
        compatibilityNotes: Object.freeze([]),
      });
      const keys = snapshotKeys(snapshot);
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('IrisExecutionCapability non contiene campi di selezione', () => {
      const cap: IrisExecutionCapability = Object.freeze({
        capabilityId: 'c1',
        supportedIntentTypes: Object.freeze(['notify']),
      });
      const keys = snapshotKeys(cap);
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(keys).not.toContain(forbidden);
      }
    });
  });

  describe('3. Nessun side-effect', () => {
    it('tipi sono read-only e snapshot è immutabile', () => {
      const snapshot: IrisContractCompatibilitySnapshot = Object.freeze({
        contracts: Object.freeze([]),
        capabilities: Object.freeze([
          Object.freeze({
            capabilityId: 'cap-1',
            supportedIntentTypes: Object.freeze(['inform']),
          }),
        ]),
        compatibilityNotes: Object.freeze([
          Object.freeze({ description: 'Note.' }),
        ]),
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.contracts)).toBe(true);
      expect(Object.isFrozen(snapshot.capabilities)).toBe(true);
      expect(Object.isFrozen(snapshot.compatibilityNotes)).toBe(true);
    });
  });
});
