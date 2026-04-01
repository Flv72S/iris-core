/**
 * Phase 12D — Governance Action Registry. Test suite.
 * Covers: store, duplicate prevention, attach auth/exec, integrity, query, ordering, edge cases, integration.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  storeAction,
  attachAuthorizationResult,
  attachExecutionResult,
  queryActions,
  getActionByHash,
  getAuditTrail,
  verifyRecordIntegrity,
  sortRegistryRecords,
} from '../index.js';
import type { GovernanceActionRecord } from '../action_registry_types.js';
import {
  createGovernanceAction,
  computeGovernanceActionHash,
} from '../../action_model/index.js';
import type { GovernanceAction, GovernanceActionMetadata } from '../../action_model/index.js';
import type { GovernanceAuthorizationResult } from '../../authorization/index.js';
import type { GovernanceExecutionResult } from '../../execution/index.js';

// --- Helpers (immutable metadata and actions; 12A uses timestamp, createGovernanceAction) ---

function metadata(params: Record<string, unknown> = {}): GovernanceActionMetadata {
  return Object.freeze({ parameters: Object.freeze({ ...params }) });
}

function createAction(
  id: string,
  type: string,
  initiator = 'init-1',
  ts = Date.now()
): GovernanceAction {
  return createGovernanceAction(id, initiator, type as Parameters<typeof createGovernanceAction>[2], metadata(), ts);
}

function makeAuthResult(
  action_id: string,
  initiator_id: string,
  status: GovernanceAuthorizationResult['status'] = 'AUTHORIZED',
  evaluated_timestamp = Date.now()
): GovernanceAuthorizationResult {
  return Object.freeze({
    action_id,
    initiator_id,
    status,
    evaluated_timestamp,
    metadata: Object.freeze({}),
  });
}

function makeExecResult(
  action_id: string,
  executor_id: string,
  status: GovernanceExecutionResult['status'] = 'EXECUTION_ACCEPTED',
  execution_timestamp = Date.now()
): GovernanceExecutionResult {
  return Object.freeze({
    action_id,
    executor_id,
    status,
    execution_timestamp,
    result_metadata: Object.freeze({}),
  });
}

// --- 2. Core tests ---

describe('Governance Action Registry (12D)', () => {
  describe('1. Store Action', () => {
    it('computes action_hash and adds record; registry count increases', () => {
      const before = queryActions().length;
      const action = createAction('store-1', 'POLICY_UPDATE', 'init-1', 1000);
      const record = storeAction(action, 2000);
      assert.ok(record.action_hash, 'action_hash must be set');
      assert.strictEqual(record.action_hash, computeGovernanceActionHash(action));
      assert.strictEqual(record.recorded_timestamp, 2000);
      assert.strictEqual(record.action.action_id, 'store-1');
      const after = queryActions().length;
      assert.strictEqual(after, before + 1, 'registry length must increase by 1');
    });
  });

  describe('2. Duplicate Prevention', () => {
    it('storing the same action twice fails with already exists', () => {
      const action = createAction('dup-1', 'NODE_WHITELIST', 'init-1', 3000);
      storeAction(action, 4000);
      assert.throws(
        () => storeAction(action, 5000),
        (err: Error) => err.message.includes('already exists')
      );
    });
  });

  describe('3. Attach Authorization Result', () => {
    it('attaches result to existing record; original record immutable; no overwrite; getActionByHash returns updated', () => {
      const action = createAction('auth-1', 'NODE_BLACKLIST', 'init-2', 6000);
      const record = storeAction(action, 7000);
      const originalRef = record;
      assert.strictEqual(record.authorization_result, undefined);

      const authResult = makeAuthResult('auth-1', 'init-2', 'AUTHORIZED', 7100);
      const updated = attachAuthorizationResult(record.action_hash, authResult);

      assert.strictEqual(originalRef.authorization_result, undefined, 'original record must remain unchanged');
      assert.strictEqual(updated.authorization_result?.status, 'AUTHORIZED');
      assert.strictEqual(updated.action_hash, record.action_hash);

      const fetched = getActionByHash(record.action_hash);
      assert.ok(fetched?.authorization_result);
      assert.strictEqual(fetched!.authorization_result!.status, 'AUTHORIZED');

      assert.throws(
        () => attachAuthorizationResult(record.action_hash, makeAuthResult('auth-1', 'init-2', 'UNAUTHORIZED', 7200)),
        (err: Error) => err.message.includes('already attached')
      );
    });
  });

  describe('4. Attach Execution Result', () => {
    it('attaches execution result; record immutable; correct association; fails if record missing or already has execution_result', () => {
      const action = createAction('exec-1', 'POLICY_UPDATE', 'init-3', 8000);
      const record = storeAction(action, 9000);
      assert.strictEqual(record.execution_result, undefined);

      const execResult = makeExecResult('exec-1', 'executor-1', 'EXECUTION_ACCEPTED', 9100);
      const updated = attachExecutionResult(record.action_hash, execResult);

      assert.strictEqual(updated.execution_result?.status, 'EXECUTION_ACCEPTED');
      assert.strictEqual(updated.action_hash, record.action_hash);

      assert.throws(
        () => attachExecutionResult(record.action_hash, makeExecResult('exec-1', 'executor-2', 'EXECUTION_REJECTED', 9200)),
        (err: Error) => err.message.includes('already attached')
      );

      assert.throws(
        () => attachExecutionResult('nonexistent-hash-12345', execResult),
        (err: Error) => err.message.includes('not found')
      );
    });
  });

  describe('5. Integrity Verification', () => {
    it('tampered record fails verifyRecordIntegrity; intact record passes', () => {
      const action = createAction('int-1', 'NODE_WHITELIST', 'init-4', 10000);
      const record = storeAction(action, 11000);
      assert.strictEqual(verifyRecordIntegrity(record), true);

      const tampered: GovernanceActionRecord = Object.freeze({
        ...record,
        action: Object.freeze({ ...record.action, action_id: 'int-1-tampered' }),
      });
      assert.strictEqual(verifyRecordIntegrity(tampered), false);
    });
  });

  describe('6. Query & Filtering', () => {
    it('filters by action_type, initiator_id, status; deterministic (reordering input gives same output)', () => {
      const base = 12000;
      const a1 = storeAction(createAction('q1', 'POLICY_UPDATE', 'alice', base + 1), base + 10);
      const a2 = storeAction(createAction('q2', 'NODE_WHITELIST', 'alice', base + 2), base + 20);
      const a3 = storeAction(createAction('q3', 'POLICY_UPDATE', 'bob', base + 3), base + 30);

      const byType = queryActions({ action_type: 'POLICY_UPDATE' });
      assert.ok(byType.some((r) => r.action_hash === a1.action_hash));
      assert.ok(byType.some((r) => r.action_hash === a3.action_hash));
      assert.ok(!byType.some((r) => r.action_hash === a2.action_hash));

      const byInitiator = queryActions({ initiator_id: 'alice' });
      assert.ok(byInitiator.some((r) => r.action_hash === a1.action_hash));
      assert.ok(byInitiator.some((r) => r.action_hash === a2.action_hash));
      assert.ok(!byInitiator.some((r) => r.action_hash === a3.action_hash));

      const byStatus = queryActions({ status: 'PENDING' });
      assert.ok(byStatus.length >= 3);
      assert.ok(byStatus.some((r) => r.action_hash === a1.action_hash));

      const combined = queryActions({ action_type: 'POLICY_UPDATE', initiator_id: 'alice' });
      assert.strictEqual(combined.filter((r) => r.action_hash === a1.action_hash).length, 1);
      assert.strictEqual(combined.filter((r) => r.action_hash === a3.action_hash).length, 0);

      const shuffled = [a3, a1, a2].map((r) => getActionByHash(r.action_hash)!).filter(Boolean);
      const sortedOnce = sortRegistryRecords(shuffled);
      const sortedTwice = sortRegistryRecords([...shuffled].reverse());
      assert.deepStrictEqual(
        sortedOnce.map((r) => r.action_hash),
        sortedTwice.map((r) => r.action_hash),
        'ordering must be deterministic'
      );
    });
  });

  describe('7. Deterministic Ordering', () => {
    it('sortRegistryRecords orders by recorded_timestamp then action_hash', () => {
      const t = 20000;
      const r1 = storeAction(createAction('ord-1', 'POLICY_UPDATE', 'x', t), t + 100);
      const r2 = storeAction(createAction('ord-2', 'NODE_BLACKLIST', 'x', t), t + 100);
      const r3 = storeAction(createAction('ord-3', 'NODE_WHITELIST', 'x', t), t + 200);

      const mixed: GovernanceActionRecord[] = [r3, r1, r2];
      const sorted = sortRegistryRecords(mixed);
      assert.strictEqual(sorted.length, 3);
      assert.strictEqual(sorted[0]!.recorded_timestamp, t + 100);
      assert.strictEqual(sorted[1]!.recorded_timestamp, t + 100);
      assert.strictEqual(sorted[2]!.recorded_timestamp, t + 200);
      const firstTwoHashes = [sorted[0]!.action_hash, sorted[1]!.action_hash].sort();
      assert.deepStrictEqual(
        firstTwoHashes,
        [r1.action_hash, r2.action_hash].sort(),
        'same timestamp: order by action_hash'
      );
    });
  });

  describe('3. Edge Cases', () => {
    it('record without authorization_result or execution_result', () => {
      const action = createAction('edge-1', 'FEDERATION_ALERT', 'init-e', 30000);
      const record = storeAction(action, 30100);
      assert.strictEqual(record.authorization_result, undefined);
      assert.strictEqual(record.execution_result, undefined);
      const byHash = getActionByHash(record.action_hash);
      assert.strictEqual(byHash?.action.action_id, 'edge-1');
    });

    it('same timestamp: ordering by action_hash', () => {
      const ts = 30200;
      const actA = createAction('ts-a', 'POLICY_UPDATE', 'i', ts);
      const actB = createAction('ts-b', 'POLICY_UPDATE', 'i', ts);
      const recA = storeAction(actA, 30300);
      const recB = storeAction(actB, 30300);
      const sorted = sortRegistryRecords([recB, recA]);
      const hashes = sorted.map((r) => r.action_hash);
      assert.deepStrictEqual(hashes, [...hashes].sort(), 'sorted by action_hash when timestamps equal');
    });

    it('attach on non-existent record throws', () => {
      const auth = makeAuthResult('nope', 'nope');
      assert.throws(
        () => attachAuthorizationResult('nonexistent-hash-xyz', auth),
        (err: Error) => err.message.includes('not found')
      );
      const exec = makeExecResult('nope', 'nope');
      assert.throws(
        () => attachExecutionResult('nonexistent-hash-xyz', exec),
        (err: Error) => err.message.includes('not found')
      );
    });
  });

  describe('4. Integration', () => {
    it('multiple actions (POLICY_UPDATE, NODE_WHITELIST, NODE_BLACKLIST); attach auth + exec; audit trail and combined query; integrity on all', () => {
      const t0 = 40000;
      const p1 = storeAction(createAction('int-p1', 'POLICY_UPDATE', 'gov-1', t0), t0 + 1);
      const w1 = storeAction(createAction('int-w1', 'NODE_WHITELIST', 'gov-1', t0 + 2), t0 + 2);
      const b1 = storeAction(createAction('int-b1', 'NODE_BLACKLIST', 'gov-2', t0 + 3), t0 + 3);

      attachAuthorizationResult(p1.action_hash, makeAuthResult('int-p1', 'gov-1', 'AUTHORIZED', t0 + 10));
      attachExecutionResult(p1.action_hash, makeExecResult('int-p1', 'exec-1', 'EXECUTION_ACCEPTED', t0 + 20));
      attachAuthorizationResult(w1.action_hash, makeAuthResult('int-w1', 'gov-1', 'AUTHORIZED', t0 + 11));
      attachExecutionResult(w1.action_hash, makeExecResult('int-w1', 'exec-1', 'EXECUTION_ACCEPTED', t0 + 21));
      attachAuthorizationResult(b1.action_hash, makeAuthResult('int-b1', 'gov-2', 'AUTHORIZED', t0 + 12));

      const trailP1 = getAuditTrail(p1.action_hash);
      assert.ok(trailP1);
      assert.strictEqual(trailP1!.action.action_id, 'int-p1');
      assert.ok(trailP1!.authorization_result);
      assert.ok(trailP1!.execution_result);

      const combined = queryActions({ action_type: 'POLICY_UPDATE', initiator_id: 'gov-1' });
      assert.ok(combined.some((r) => r.action_hash === p1.action_hash));
      assert.strictEqual(combined.filter((r) => r.action_hash === w1.action_hash).length, 0);
      assert.strictEqual(combined.filter((r) => r.action_hash === b1.action_hash).length, 0);

      const all = queryActions();
      for (const r of all) {
        assert.strictEqual(verifyRecordIntegrity(r), true, `integrity must pass for ${r.action_hash}`);
      }
    });
  });
});
