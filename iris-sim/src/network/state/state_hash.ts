/**
 * Phase 14A — State Model Definition. Multi-layer deterministic state hashing (SHA256).
 */

import { createHash } from 'node:crypto';
import type { NetworkState } from './network_state.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Canonical serialization of a record (sorted keys). */
function serializeRecord(record: Readonly<Record<string, unknown>>): string {
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => JSON.stringify(k) + ':' + serializeValue(record[k]));
  return '{' + parts.join(',') + '}';
}

function serializeValue(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(serializeValue).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + serializeValue((v as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

export interface StateHashRoot {
  readonly node_state_hash: string;
  readonly trust_state_hash: string;
  readonly governance_state_hash: string;
  readonly topology_state_hash: string;
  readonly policy_state_hash: string;
  readonly global_hash: string;
}

/** Compute per-layer hashes and global hash. Does not mutate state. */
export function computeStateHash(state: NetworkState): StateHashRoot {
  const nodePayload = serializeRecord(state.nodes as unknown as Record<string, unknown>);
  const trustPayload = serializeRecord(state.trust as unknown as Record<string, unknown>);
  const govPayload = serializeRecord(state.governance as unknown as Record<string, unknown>);
  const topoPayload = serializeRecord(state.topology as unknown as Record<string, unknown>);
  const policyPayload = serializeRecord(state.policies as unknown as Record<string, unknown>);

  const node_state_hash = sha256Hex(nodePayload);
  const trust_state_hash = sha256Hex(trustPayload);
  const governance_state_hash = sha256Hex(govPayload);
  const topology_state_hash = sha256Hex(topoPayload);
  const policy_state_hash = sha256Hex(policyPayload);

  const combined =
    node_state_hash +
    trust_state_hash +
    governance_state_hash +
    topology_state_hash +
    policy_state_hash;
  const global_hash = sha256Hex(combined);

  return {
    node_state_hash,
    trust_state_hash,
    governance_state_hash,
    topology_state_hash,
    policy_state_hash,
    global_hash,
  };
}
