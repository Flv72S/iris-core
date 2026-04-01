/**
 * Phase 13XX-G — Trust Ledger. Tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { LedgerEntry } from '../ledger_entry.js';
import type { LedgerStore } from '../ledger_storage.js';
import {
  InMemoryLedgerStore,
  LedgerWriter,
  LedgerReader,
  TrustLedgerService,
  LedgerHashChain,
  LedgerError,
  LedgerErrorCode,
} from '../index.js';

describe('Trust Ledger (Phase 13XX-G)', () => {
  describe('append entry', () => {
    it('writer appends entry with previous_hash and entry_hash', () => {
      const store = new InMemoryLedgerStore();
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'entry-0',
        node_id: 'n1',
        type: 'TRUST_UPDATE',
        timestamp: 1000,
        data: { previous_score: 0.1, new_score: 0.8 },
      });
      const all = store.getAll();
      assert.strictEqual(all.length, 1);
      assert.strictEqual(all[0].entry_id, 'entry-0');
      assert.strictEqual(all[0].previous_hash, undefined);
      assert.ok(typeof all[0].entry_hash === 'string' && all[0].entry_hash!.length > 0);
    });

    it('second entry links to first hash', () => {
      const store = new InMemoryLedgerStore();
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'entry-0',
        node_id: 'n1',
        type: 'TRUST_UPDATE',
        timestamp: 1000,
        data: { previous_score: 0.1, new_score: 0.8 },
      });
      writer.append({
        entry_id: 'entry-1',
        node_id: 'n1',
        type: 'ANOMALY_DETECTED',
        timestamp: 2000,
        data: { anomaly_type: 'TRUST_SPIKE', severity: 'MEDIUM' },
      });
      const all = store.getAll();
      assert.strictEqual(all.length, 2);
      assert.strictEqual(all[1].previous_hash, all[0].entry_hash);
    });
  });

  describe('read entries by node', () => {
    it('getEntriesForNode returns only that node', () => {
      const store = new InMemoryLedgerStore();
      const reader = new LedgerReader(store);
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'e0',
        node_id: 'a',
        type: 'TRUST_UPDATE',
        timestamp: 0,
        data: {},
      });
      writer.append({
        entry_id: 'e1',
        node_id: 'b',
        type: 'TRUST_UPDATE',
        timestamp: 0,
        data: {},
      });
      writer.append({
        entry_id: 'e2',
        node_id: 'a',
        type: 'ANOMALY_DETECTED',
        timestamp: 0,
        data: {},
      });
      const forA = reader.getEntriesForNode('a');
      assert.strictEqual(forA.length, 2);
      assert.ok(forA.every((e) => e.node_id === 'a'));
    });
  });

  describe('read entries by type', () => {
    it('getEntriesByType returns only that type', () => {
      const store = new InMemoryLedgerStore();
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'e0',
        node_id: 'x',
        type: 'TRUST_UPDATE',
        timestamp: 0,
        data: {},
      });
      writer.append({
        entry_id: 'e1',
        node_id: 'x',
        type: 'GOVERNANCE_DECISION',
        timestamp: 0,
        data: {},
      });
      const reader = new LedgerReader(store);
      const trust = reader.getEntriesByType('TRUST_UPDATE');
      assert.strictEqual(trust.length, 1);
      assert.strictEqual(trust[0].type, 'TRUST_UPDATE');
    });
  });

  describe('hash chain integrity', () => {
    it('verifyIntegrity returns true for valid chain', () => {
      const store = new InMemoryLedgerStore();
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'e0',
        node_id: 'n',
        type: 'TRUST_UPDATE',
        timestamp: 0,
        data: {},
      });
      const reader = new LedgerReader(store);
      assert.strictEqual(reader.verifyIntegrity(), true);
    });
  });

  describe('tamper detection', () => {
    it('verifyIntegrity throws when entry_hash is wrong', () => {
      const store = new InMemoryLedgerStore();
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'e0',
        node_id: 'n',
        type: 'TRUST_UPDATE',
        timestamp: 0,
        data: {},
      });
      const all = store.getAll();
      const tampered: LedgerEntry[] = [
        { ...all[0], entry_hash: 'wrong' },
      ];
      const badStore: LedgerStore = {
        append: () => {},
        getAll: () => tampered,
      };
      const reader = new LedgerReader(badStore);
      assert.throws(
        () => reader.verifyIntegrity(),
        (e: Error) => e instanceof LedgerError && e.code === LedgerErrorCode.CORRUPTION_DETECTED
      );
    });
  });

  describe('canonical hash stability (13XX-G-P1)', () => {
    it('equivalent data produces identical hashes regardless of key order', () => {
      const hashChain = new LedgerHashChain();
      const base = {
        entry_id: 'e0',
        node_id: 'n',
        type: 'TRUST_UPDATE' as const,
        timestamp: 1000,
        previous_hash: undefined as string | undefined,
      };
      const entryA = { ...base, data: { a: 1, b: 2 } };
      const entryB = { ...base, data: { b: 2, a: 1 } };
      const hashA = hashChain.computeEntryHash(entryA);
      const hashB = hashChain.computeEntryHash(entryB);
      assert.strictEqual(hashA, hashB);
    });
  });

  describe('immutable entry (13XX-G-P1)', () => {
    it('stored entries are frozen and cannot be mutated at runtime', () => {
      const store = new InMemoryLedgerStore();
      const writer = new LedgerWriter(store);
      writer.append({
        entry_id: 'e0',
        node_id: 'original',
        type: 'TRUST_UPDATE',
        timestamp: 0,
        data: {},
      });
      const entry = store.getAll()[0];
      assert.strictEqual(Object.isFrozen(entry), true);
      let threw = false;
      try {
        (entry as { node_id: string }).node_id = 'other';
      } catch (e) {
        threw = true;
      }
      assert.ok(threw, 'Mutation of frozen entry must throw');
      assert.strictEqual(entry.node_id, 'original');
    });
  });

  describe('ledger determinism', () => {
    it('same sequence produces same hashes', () => {
      const store1 = new InMemoryLedgerStore();
      const store2 = new InMemoryLedgerStore();
      const w1 = new LedgerWriter(store1);
      const w2 = new LedgerWriter(store2);
      const entry: LedgerEntry = {
        entry_id: 'entry-0',
        node_id: 'd',
        type: 'TRUST_UPDATE',
        timestamp: 5000,
        data: { previous_score: 0.2, new_score: 0.9 },
      };
      w1.append(entry);
      w2.append(entry);
      assert.strictEqual(store1.getAll()[0].entry_hash, store2.getAll()[0].entry_hash);
    });
  });

  describe('TrustLedgerService', () => {
    it('recordTrustUpdate and getEntriesForNode', () => {
      const store = new InMemoryLedgerStore();
      const service = new TrustLedgerService(store);
      service.recordTrustUpdate('ai-test-node', 0.1, 0.8, 10_000);
      const entries = service.getEntriesForNode('ai-test-node');
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].type, 'TRUST_UPDATE');
      assert.strictEqual((entries[0].data as { new_score: number }).new_score, 0.8);
    });

    it('recordAnomaly creates ANOMALY_DETECTED entry', () => {
      const store = new InMemoryLedgerStore();
      const service = new TrustLedgerService(store);
      service.recordTrustUpdate('n', 0, 0, 0);
      service.recordAnomaly({
        node_id: 'ai-test-node',
        anomaly_type: 'TRUST_SPIKE',
        severity: 'MEDIUM',
        description: 'Unexpected trust increase',
        detected_at: 11_000,
      });
      const byType = service.getEntriesByType('ANOMALY_DETECTED');
      assert.strictEqual(byType.length, 1);
      assert.strictEqual((byType[0].data as { anomaly_type: string }).anomaly_type, 'TRUST_SPIKE');
    });

    it('recordGovernanceDecision creates GOVERNANCE_DECISION entry', () => {
      const store = new InMemoryLedgerStore();
      const service = new TrustLedgerService(store);
      service.recordGovernanceDecision({
        node_id: 'ai-test-node',
        action: 'SUSPEND_NODE',
        reason: 'Critical anomaly detected',
        severity: 'CRITICAL',
        decided_at: 12_000,
      });
      const entries = service.getEntriesForNode('ai-test-node');
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].type, 'GOVERNANCE_DECISION');
      assert.strictEqual((entries[0].data as { action: string }).action, 'SUSPEND_NODE');
    });

    it('recordPassportUpdate and verifyIntegrity', () => {
      const store = new InMemoryLedgerStore();
      const service = new TrustLedgerService(store);
      service.recordTrustUpdate('p', 0, 0.5, 0);
      service.recordPassportUpdate('p', { anomaly_count: 1 } as Record<string, unknown>, 1000);
      assert.strictEqual(service.verifyIntegrity(), true);
      const entries = service.getEntriesByType('PASSPORT_UPDATE');
      assert.strictEqual(entries.length, 1);
    });

    it('getEntry returns entry by id', () => {
      const store = new InMemoryLedgerStore();
      const service = new TrustLedgerService(store);
      service.recordTrustUpdate('q', 0, 1, 0);
      const entry = service.getEntry('entry-0');
      assert.ok(entry !== null);
      assert.strictEqual(entry!.entry_id, 'entry-0');
      assert.strictEqual(service.getEntry('missing'), null);
    });
  });
});
