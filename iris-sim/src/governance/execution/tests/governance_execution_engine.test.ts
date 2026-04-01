/**
 * Phase 12B — Governance Execution Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateAction,
  executeAction,
  rejectAction,
  sortActionsForExecution,
} from '../index.js';
import {
  createGovernanceAction,
  type GovernanceAction,
  type GovernanceActionMetadata,
} from '../../action_model/index.js';

function metadata(params: Record<string, unknown> = {}): GovernanceActionMetadata {
  return Object.freeze({ parameters: Object.freeze({ ...params }) });
}

/** Create an authorized action (engine requires AUTHORIZED status for execution). */
function authorizedAction(
  action_id: string,
  action_type: GovernanceAction['action_type'] = 'POLICY_UPDATE',
  timestamp: number = 1000
): GovernanceAction {
  const action = createGovernanceAction(action_id, 'initiator-1', action_type, metadata(), timestamp);
  return Object.freeze({ ...action, status: 'AUTHORIZED' });
}

describe('Governance Execution Engine', () => {
  it('Test 1 — Valid Execution: authorized action yields EXECUTION_ACCEPTED', () => {
    const action = authorizedAction('act-1', 'NODE_TRUST_REVOCATION', 2000);
    const result = executeAction(action, 'executor-node-1', 3000);
    assert.strictEqual(result.status, 'EXECUTION_ACCEPTED');
    assert.strictEqual(result.action_id, 'act-1');
    assert.strictEqual(result.executor_id, 'executor-node-1');
    assert.strictEqual(result.execution_timestamp, 3000);
    assert.strictEqual((result.result_metadata as { executed?: boolean }).executed, true);
    assert.strictEqual((result.result_metadata as { action_type?: string }).action_type, 'NODE_TRUST_REVOCATION');
  });

  it('Test 2 — Invalid Action Structure: malformed action yields EXECUTION_REJECTED', () => {
    const malformed: GovernanceAction = Object.freeze({
      action_id: '',
      initiator_id: 'init',
      action_type: 'POLICY_UPDATE',
      metadata: metadata(),
      status: 'AUTHORIZED',
      timestamp: 1000,
    });
    const result = executeAction(malformed, 'exec-1', 2000);
    assert.strictEqual(result.status, 'EXECUTION_REJECTED');
    assert.strictEqual((result.result_metadata as { validation_failed?: boolean }).validation_failed, true);
  });

  it('Test 2 — Invalid Action: PENDING status yields EXECUTION_REJECTED', () => {
    const action = createGovernanceAction('act-pending', 'init', 'POLICY_UPDATE', metadata(), 1000);
    assert.strictEqual(action.status, 'PENDING');
    const result = executeAction(action, 'exec-1', 2000);
    assert.strictEqual(result.status, 'EXECUTION_REJECTED');
  });

  it('Test 3 — Reject Action: rejectAction yields EXECUTION_REJECTED with reason', () => {
    const action = authorizedAction('act-reject', 'FEDERATION_ALERT', 1500);
    const result = rejectAction(action, 'exec-1', 2500, 'Policy violation');
    assert.strictEqual(result.status, 'EXECUTION_REJECTED');
    assert.strictEqual(result.action_id, 'act-reject');
    assert.strictEqual(result.execution_timestamp, 2500);
    assert.strictEqual((result.result_metadata as { rejection_reason?: string }).rejection_reason, 'Policy violation');
  });

  it('Test 4 — Deterministic Sorting: shuffled actions sort to same order', () => {
    const a = authorizedAction('act-c', 'POLICY_UPDATE', 100);
    const b = authorizedAction('act-a', 'POLICY_UPDATE', 100);
    const c = authorizedAction('act-b', 'POLICY_UPDATE', 50);
    const shuffled = [a, b, c];
    const sorted = sortActionsForExecution(shuffled);
    assert.strictEqual(sorted.length, 3);
    assert.strictEqual(sorted[0]!.action_id, 'act-b');
    assert.strictEqual(sorted[0]!.timestamp, 50);
    assert.strictEqual(sorted[1]!.action_id, 'act-a');
    assert.strictEqual(sorted[2]!.action_id, 'act-c');
    const sortedAgain = sortActionsForExecution([c, a, b]);
    assert.deepStrictEqual(
      sortedAgain.map((x) => x.action_id),
      sorted.map((x) => x.action_id)
    );
  });

  it('Test 5 — Deterministic Execution Results: same input yields identical result', () => {
    const action = authorizedAction('act-det', 'NODE_WHITELIST', 4000);
    const result1 = executeAction(action, 'exec-1', 5000);
    const result2 = executeAction(action, 'exec-1', 5000);
    assert.strictEqual(result1.status, result2.status);
    assert.strictEqual(result1.action_id, result2.action_id);
    assert.strictEqual(JSON.stringify(result1), JSON.stringify(result2));
  });

  it('validateAction: returns true for valid authorized action', () => {
    const action = authorizedAction('v1', 'GOVERNANCE_METADATA_UPDATE');
    assert.strictEqual(validateAction(action), true);
  });

  it('validateAction: returns false for PENDING action', () => {
    const action = createGovernanceAction('v2', 'init', 'POLICY_UPDATE', metadata(), 1000);
    assert.strictEqual(validateAction(action), false);
  });
});
