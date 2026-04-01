/**
 * Phase 12A — Governance Action Model tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createGovernanceAction,
  validateGovernanceAction,
  stableGovernanceActionStringify,
  computeGovernanceActionHash,
  type GovernanceAction,
  type GovernanceActionMetadata,
} from '../index.js';

function metadata(params: Record<string, unknown> = {}): GovernanceActionMetadata {
  return Object.freeze({ parameters: Object.freeze({ ...params }) });
}

describe('Governance Action Model', () => {
  it('Test 1 — Action Creation: new action has status PENDING', () => {
    const action = createGovernanceAction(
      'act-1',
      'initiator-node-1',
      'NODE_TRUST_REVOCATION',
      metadata({ node_id: 'n1' }),
      1000
    );
    assert.strictEqual(action.status, 'PENDING');
    assert.strictEqual(action.action_id, 'act-1');
    assert.strictEqual(action.initiator_id, 'initiator-node-1');
    assert.strictEqual(action.action_type, 'NODE_TRUST_REVOCATION');
    assert.strictEqual(action.timestamp, 1000);
  });

  it('Test 2 — Validation Success: valid action returns true', () => {
    const action = createGovernanceAction(
      'act-2',
      'init-2',
      'POLICY_UPDATE',
      metadata(),
      2000
    );
    assert.strictEqual(validateGovernanceAction(action), true);
  });

  it('Test 3 — Validation Failure: empty action_id returns false', () => {
    const action: GovernanceAction = Object.freeze({
      action_id: '',
      initiator_id: 'init',
      action_type: 'FEDERATION_ALERT',
      metadata: metadata(),
      status: 'PENDING',
      timestamp: 3000,
    });
    assert.strictEqual(validateGovernanceAction(action), false);
  });

  it('Test 3 — Validation Failure: invalid status returns false', () => {
    const action: GovernanceAction = Object.freeze({
      action_id: 'act-x',
      initiator_id: 'init',
      action_type: 'FEDERATION_ALERT',
      metadata: metadata(),
      status: 'INVALID_STATUS' as GovernanceAction['status'],
      timestamp: 3000,
    });
    assert.strictEqual(validateGovernanceAction(action), false);
  });

  it('Test 3 — Validation Failure: invalid action_type returns false', () => {
    const action: GovernanceAction = Object.freeze({
      action_id: 'act-x',
      initiator_id: 'init',
      action_type: 'INVALID_TYPE' as GovernanceAction['action_type'],
      metadata: metadata(),
      status: 'PENDING',
      timestamp: 3000,
    });
    assert.strictEqual(validateGovernanceAction(action), false);
  });

  it('Test 3 — Validation Failure: invalid timestamp (NaN) returns false', () => {
    const action: GovernanceAction = Object.freeze({
      action_id: 'act-x',
      initiator_id: 'init',
      action_type: 'FEDERATION_ALERT',
      metadata: metadata(),
      status: 'PENDING',
      timestamp: NaN,
    });
    assert.strictEqual(validateGovernanceAction(action), false);
  });

  it('Test 3 — Validation Failure: empty initiator_id returns false', () => {
    const action: GovernanceAction = Object.freeze({
      action_id: 'act-x',
      initiator_id: '   ',
      action_type: 'FEDERATION_ALERT',
      metadata: metadata(),
      status: 'PENDING',
      timestamp: 3000,
    });
    assert.strictEqual(validateGovernanceAction(action), false);
  });

  it('Test 4 — Deterministic Hash: identical actions produce identical hash', () => {
    const meta = metadata({ key: 'value' });
    const a = createGovernanceAction('id-1', 'init-1', 'NODE_BLACKLIST', meta, 4000);
    const b = createGovernanceAction('id-1', 'init-1', 'NODE_BLACKLIST', meta, 4000);
    const hash1 = computeGovernanceActionHash(a);
    const hash2 = computeGovernanceActionHash(b);
    assert.strictEqual(hash1, hash2);
  });

  it('Test 5 — Serialization Determinism: different key order produces identical string', () => {
    const action1: GovernanceAction = Object.freeze({
      action_id: 'a',
      initiator_id: 'i',
      action_type: 'POLICY_UPDATE',
      metadata: Object.freeze({ parameters: Object.freeze({ x: 1, y: 2 }) }),
      status: 'PENDING',
      timestamp: 5000,
    });
    const action2: GovernanceAction = Object.freeze({
      timestamp: 5000,
      status: 'PENDING',
      metadata: Object.freeze({ parameters: Object.freeze({ y: 2, x: 1 }) }),
      action_type: 'POLICY_UPDATE',
      initiator_id: 'i',
      action_id: 'a',
    });
    const s1 = stableGovernanceActionStringify(action1);
    const s2 = stableGovernanceActionStringify(action2);
    assert.strictEqual(s1, s2, 'canonical serialization must be key-order independent');
    assert.strictEqual(computeGovernanceActionHash(action1), computeGovernanceActionHash(action2));
  });

  it('createGovernanceAction throws on empty action_id', () => {
    assert.throws(
      () => createGovernanceAction('', 'init', 'FEDERATION_ALERT', metadata(), 1000),
      /action_id must be non-empty/
    );
  });

  it('createGovernanceAction throws on empty initiator_id', () => {
    assert.throws(
      () => createGovernanceAction('act', '', 'FEDERATION_ALERT', metadata(), 1000),
      /initiator_id must be non-empty/
    );
  });

  it('createGovernanceAction throws on invalid timestamp', () => {
    assert.throws(
      () => createGovernanceAction('act', 'init', 'FEDERATION_ALERT', metadata(), NaN),
      /timestamp must be a valid number/
    );
  });
});
