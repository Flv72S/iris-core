/**
 * Phase 12E — Execution Result Attestation. Engine.
 * Deterministic result hash and proof generation.
 */

import { createHash } from 'node:crypto';
import type { GovernanceExecutionResult } from '../execution/index.js';
import type { ExecutionProof } from './execution_attestation_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Deterministic result fingerprint for replay verification.
 */
export function computeExecutionResultHash(result: GovernanceExecutionResult): string {
  return sha256Hex(stableStringify(result));
}

/**
 * Build execution proof from execution result.
 */
export function generateExecutionProof(result: GovernanceExecutionResult): ExecutionProof {
  const result_hash = computeExecutionResultHash(result);
  return Object.freeze({
    action_id: result.action_id,
    executor_id: result.executor_id,
    execution_timestamp: result.execution_timestamp,
    execution_status: result.status,
    result_hash,
  });
}
