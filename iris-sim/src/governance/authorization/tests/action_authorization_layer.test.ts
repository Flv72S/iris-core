/**
 * Phase 12C — Action Authorization Layer tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  authorizeAction,
  evaluatePolicy,
  validateScope,
  isActionAuthorized,
} from '../index.js';
import {
  createGovernanceAction,
  type GovernanceAction,
  type GovernanceActionMetadata,
} from '../../action_model/index.js';

function metadata(params: Record<string, unknown> = {}): GovernanceActionMetadata {
  return Object.freeze({ parameters: Object.freeze({ ...params }) });
}

function makeAction(
  action_id: string,
  action_type: GovernanceAction['action_type'],
  timestamp: number = 1000
): GovernanceAction {
  return createGovernanceAction(action_id, 'initiator-1', action_type, metadata(), timestamp);
}

describe('Action Authorization Layer', () => {
  it('Test 1 — Authorized Action: ADMIN executing NODE_BLACKLIST → AUTHORIZED', () => {
    const action = makeAction('act-1', 'NODE_BLACKLIST', 2000);
    const result = authorizeAction(action, 'ADMIN', 'GLOBAL', 3000);
    assert.strictEqual(result.status, 'AUTHORIZED');
    assert.strictEqual(result.action_id, 'act-1');
    assert.strictEqual(result.initiator_id, 'initiator-1');
    assert.strictEqual(isActionAuthorized(result), true);
  });

  it('Test 2 — Role Violation: OBSERVER executing NODE_BLACKLIST → ROLE_VIOLATION', () => {
    const action = makeAction('act-2', 'NODE_BLACKLIST', 2000);
    const result = authorizeAction(action, 'OBSERVER', 'GLOBAL', 3000);
    assert.strictEqual(result.status, 'ROLE_VIOLATION');
    assert.strictEqual(isActionAuthorized(result), false);
  });

  it('Test 3 — Scope Violation: NODE action with scope ORGANIZATION → SCOPE_VIOLATION', () => {
    const action = makeAction('act-3', 'NODE_BLACKLIST', 2000);
    const result = authorizeAction(action, 'ADMIN', 'ORGANIZATION', 3000);
    assert.strictEqual(result.status, 'SCOPE_VIOLATION');
    assert.strictEqual(isActionAuthorized(result), false);
  });

  it('Test 3 — Scope valid for NODE action: NODE scope → AUTHORIZED', () => {
    const action = makeAction('act-3b', 'NODE_TRUST_REVOCATION', 2000);
    const result = authorizeAction(action, 'GOVERNOR', 'NODE', 3000);
    assert.strictEqual(result.status, 'AUTHORIZED');
  });

  it('Test 4 — Determinism: same inputs produce identical authorization results', () => {
    const action = makeAction('act-4', 'POLICY_UPDATE', 4000);
    const result1 = authorizeAction(action, 'ADMIN', 'GLOBAL', 5000);
    const result2 = authorizeAction(action, 'ADMIN', 'GLOBAL', 5000);
    assert.strictEqual(result1.status, result2.status);
    assert.strictEqual(JSON.stringify(result1), JSON.stringify(result2));
  });

  it('Test 5 — Policy Evaluation: NODE_TRUST_REVOCATION allowed for ADMIN and GOVERNOR', () => {
    assert.strictEqual(evaluatePolicy('NODE_TRUST_REVOCATION', 'ADMIN'), true);
    assert.strictEqual(evaluatePolicy('NODE_TRUST_REVOCATION', 'GOVERNOR'), true);
    assert.strictEqual(evaluatePolicy('NODE_TRUST_REVOCATION', 'OBSERVER'), false);
  });

  it('Test 5 — Policy Evaluation: NODE_BLACKLIST only ADMIN', () => {
    assert.strictEqual(evaluatePolicy('NODE_BLACKLIST', 'ADMIN'), true);
    assert.strictEqual(evaluatePolicy('NODE_BLACKLIST', 'GOVERNOR'), false);
    assert.strictEqual(evaluatePolicy('NODE_BLACKLIST', 'OBSERVER'), false);
  });

  it('Test 5 — Policy Evaluation: FEDERATION_ALERT allowed for ADMIN and GOVERNOR', () => {
    assert.strictEqual(evaluatePolicy('FEDERATION_ALERT', 'ADMIN'), true);
    assert.strictEqual(evaluatePolicy('FEDERATION_ALERT', 'GOVERNOR'), true);
    assert.strictEqual(evaluatePolicy('FEDERATION_ALERT', 'OBSERVER'), false);
  });

  it('Test 5 — Policy Evaluation: POLICY_UPDATE and PROTOCOL_PARAMETER_UPDATE only ADMIN', () => {
    assert.strictEqual(evaluatePolicy('POLICY_UPDATE', 'ADMIN'), true);
    assert.strictEqual(evaluatePolicy('POLICY_UPDATE', 'GOVERNOR'), false);
    assert.strictEqual(evaluatePolicy('PROTOCOL_PARAMETER_UPDATE', 'ADMIN'), true);
    assert.strictEqual(evaluatePolicy('PROTOCOL_PARAMETER_UPDATE', 'OBSERVER'), false);
  });

  it('validateScope: NODE action with NODE or GLOBAL scope returns true', () => {
    const action = makeAction('a', 'NODE_WHITELIST');
    assert.strictEqual(validateScope(action, 'NODE'), true);
    assert.strictEqual(validateScope(action, 'GLOBAL'), true);
  });

  it('validateScope: NODE action with ORGANIZATION scope returns false', () => {
    const action = makeAction('a', 'NODE_TRUST_RESTORE');
    assert.strictEqual(validateScope(action, 'ORGANIZATION'), false);
  });

  it('validateScope: non-NODE action accepts any scope', () => {
    const action = makeAction('a', 'POLICY_UPDATE');
    assert.strictEqual(validateScope(action, 'ORGANIZATION'), true);
    assert.strictEqual(validateScope(action, 'GLOBAL'), true);
  });
});
