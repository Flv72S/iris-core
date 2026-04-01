/**
 * Phase 12E — Execution Result Attestation. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeExecutionResultHash,
  generateExecutionProof,
  signExecutionProof,
  verifyExecutionAttestation,
  createAttestationFromRecord,
} from '../index.js';
import { createGovernanceAction } from '../../action_model/index.js';
import { storeAction, attachExecutionResult, getActionByHash } from '../../registry/index.js';

function metadata(params: Record<string, unknown> = {}): { parameters: Record<string, unknown> } {
  return Object.freeze({ parameters: Object.freeze({ ...params }) });
}

function makeExecResult(
  action_id: string,
  executor_id: string,
  status: 'EXECUTION_ACCEPTED' | 'EXECUTION_REJECTED' | 'EXECUTION_FAILED' = 'EXECUTION_ACCEPTED',
  execution_timestamp = 1000
): { action_id: string; executor_id: string; status: typeof status; execution_timestamp: number; result_metadata: Record<string, unknown> } {
  return Object.freeze({
    action_id,
    executor_id,
    status,
    execution_timestamp,
    result_metadata: Object.freeze({}),
  });
}

const SIGNING_KEY = 'test-signing-key';

describe('Execution Result Attestation (12E)', () => {
  it('Test 1 — Result Hash Determinism: compute hash twice, hash1 === hash2', () => {
    const result = makeExecResult('act-1', 'exec-1', 'EXECUTION_ACCEPTED', 2000);
    const hash1 = computeExecutionResultHash(result);
    const hash2 = computeExecutionResultHash(result);
    assert.strictEqual(hash1, hash2);
  });

  it('Test 2 — Proof Generation: result_hash defined, execution_status correct', () => {
    const result = makeExecResult('act-2', 'exec-2', 'EXECUTION_REJECTED', 3000);
    const proof = generateExecutionProof(result);
    assert.ok(proof.result_hash);
    assert.strictEqual(proof.execution_status, 'EXECUTION_REJECTED');
    assert.strictEqual(proof.action_id, 'act-2');
    assert.strictEqual(proof.executor_id, 'exec-2');
    assert.strictEqual(proof.execution_timestamp, 3000);
  });

  it('Test 3 — Signature Generation: sign proof, signature exists', () => {
    const result = makeExecResult('act-3', 'exec-3', 'EXECUTION_ACCEPTED', 4000);
    const proof = generateExecutionProof(result);
    const attestation = signExecutionProof(proof, SIGNING_KEY, 'signer-1');
    assert.ok(attestation.signature);
    assert.strictEqual(attestation.signer_id, 'signer-1');
    assert.strictEqual(attestation.proof, proof);
  });

  it('Test 4 — Signature Verification: verify signed proof returns true', () => {
    const result = makeExecResult('act-4', 'exec-4', 'EXECUTION_ACCEPTED', 5000);
    const proof = generateExecutionProof(result);
    const attestation = signExecutionProof(proof, SIGNING_KEY, 'signer-2');
    assert.strictEqual(verifyExecutionAttestation(attestation, SIGNING_KEY), true);
  });

  it('Test 5 — Tampered Proof Detection: modified proof → verification false', () => {
    const result = makeExecResult('act-5', 'exec-5', 'EXECUTION_ACCEPTED', 6000);
    const proof = generateExecutionProof(result);
    const attestation = signExecutionProof(proof, SIGNING_KEY, 'signer-3');
    const tampered = Object.freeze({
      ...attestation,
      proof: Object.freeze({ ...attestation.proof, result_hash: 'tampered-result-hash' }),
    });
    assert.strictEqual(verifyExecutionAttestation(tampered, SIGNING_KEY), false);
    const wrongKey = verifyExecutionAttestation(attestation, 'wrong-key');
    assert.strictEqual(wrongKey, false);
  });

  it('Test 6 — Registry Integration: createAttestationFromRecord, attestation.proof.action_id === record.action.action_id', () => {
    const action = createGovernanceAction('reg-act', 'init-1', 'POLICY_UPDATE', metadata(), 7000);
    const record = storeAction(action, 7100);
    const execResult = makeExecResult('reg-act', 'exec-reg', 'EXECUTION_ACCEPTED', 7200);
    attachExecutionResult(record.action_hash, execResult);
    const updated = getActionByHash(record.action_hash);
    assert.ok(updated?.execution_result);
    const attestation = createAttestationFromRecord(updated, SIGNING_KEY, 'signer-reg');
    assert.strictEqual(attestation.proof.action_id, record.action.action_id);
    assert.strictEqual(verifyExecutionAttestation(attestation, SIGNING_KEY), true);
  });
});