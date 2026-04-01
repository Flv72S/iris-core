/**
 * Phase 12A — Governance Action Model. Helper utilities.
 * Deterministic, pure, no side effects.
 */

import { createHash } from 'node:crypto';
import type { ActionType, GovernanceAction, GovernanceActionMetadata } from './governance_action_types.js';

const VALID_ACTION_TYPES: ReadonlySet<string> = new Set([
  'NODE_TRUST_REVOCATION',
  'NODE_TRUST_RESTORE',
  'NODE_BLACKLIST',
  'NODE_WHITELIST',
  'POLICY_UPDATE',
  'PROTOCOL_PARAMETER_UPDATE',
  'FEDERATION_ALERT',
  'GOVERNANCE_METADATA_UPDATE',
]);

const VALID_ACTION_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'AUTHORIZED',
  'REJECTED',
  'EXECUTED',
  'FAILED',
]);

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Deterministic canonical serialization. Keys sorted; safe for hashing.
 */
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Creates a new governance action in PENDING state. Validates inputs; returns immutable object.
 * @throws if action_id or initiator_id is empty, action_type invalid, or timestamp invalid
 */
export function createGovernanceAction(
  action_id: string,
  initiator_id: string,
  action_type: ActionType,
  metadata: GovernanceActionMetadata,
  timestamp: number
): GovernanceAction {
  if (typeof action_id !== 'string' || action_id.trim() === '') {
    throw new Error('GovernanceAction: action_id must be non-empty');
  }
  if (typeof initiator_id !== 'string' || initiator_id.trim() === '') {
    throw new Error('GovernanceAction: initiator_id must be non-empty');
  }
  if (!VALID_ACTION_TYPES.has(action_type)) {
    throw new Error('GovernanceAction: invalid action_type');
  }
  if (!Number.isFinite(timestamp)) {
    throw new Error('GovernanceAction: timestamp must be a valid number');
  }
  const action: GovernanceAction = Object.freeze({
    action_id,
    initiator_id,
    action_type,
    metadata: Object.freeze(metadata),
    status: 'PENDING',
    timestamp,
  });
  return action;
}

/**
 * Validates a governance action. Pure and deterministic.
 * Returns true iff action_type valid, status valid, non-empty action_id, non-empty initiator_id, valid timestamp.
 */
export function validateGovernanceAction(action: GovernanceAction): boolean {
  if (action == null || typeof action !== 'object') return false;
  if (typeof action.action_id !== 'string' || action.action_id.trim() === '') return false;
  if (typeof action.initiator_id !== 'string' || action.initiator_id.trim() === '') return false;
  if (!VALID_ACTION_TYPES.has(action.action_type)) return false;
  if (!VALID_ACTION_STATUSES.has(action.status)) return false;
  if (!Number.isFinite(action.timestamp)) return false;
  if (action.metadata == null || typeof action.metadata !== 'object') return false;
  if (typeof action.metadata.parameters !== 'object' || action.metadata.parameters === null) return false;
  return true;
}

/**
 * Deterministic canonical serialization of a governance action for hashing.
 */
export function stableGovernanceActionStringify(action: GovernanceAction): string {
  return stableStringify(action);
}

/**
 * Computes a deterministic SHA-256 hex hash of the action. Stable regardless of property order.
 */
export function computeGovernanceActionHash(action: GovernanceAction): string {
  return sha256Hex(stableGovernanceActionStringify(action));
}
