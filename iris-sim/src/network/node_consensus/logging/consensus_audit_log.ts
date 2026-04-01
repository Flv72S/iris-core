/**
 * Phase 11A — Structured audit log for federated consensus.
 * Log entries are hashable and verifiable.
 */

import { hashConsensusPayload } from '../hashing/consensus_hash.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';

export type ConsensusLogPhase =
  | 'snapshot_ingestion'
  | 'conflict_detection'
  | 'conflict_resolution'
  | 'consensus_hash_generation'
  | 'proof_generation';

export interface ConsensusAuditEntry {
  readonly phase: ConsensusLogPhase;
  readonly timestamp: number;
  readonly payload: unknown;
  readonly entry_hash: string;
  readonly version: string;
}

/**
 * Create a structured, hashable audit log entry.
 */
export function createConsensusAuditEntry(
  phase: ConsensusLogPhase,
  payload: unknown
): ConsensusAuditEntry {
  const timestamp = Date.now();
  const raw = { phase, timestamp, payload, version: CONSENSUS_ENGINE_SCHEMA_VERSION };
  const entry_hash = hashConsensusPayload(raw);
  return Object.freeze({
    phase,
    timestamp,
    payload,
    entry_hash,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
}

/**
 * Verify an audit entry: recompute hash and compare.
 */
export function verifyConsensusAuditEntry(entry: ConsensusAuditEntry): boolean {
  const raw = { phase: entry.phase, timestamp: entry.timestamp, payload: entry.payload, version: entry.version };
  const expected = hashConsensusPayload(raw);
  return expected === entry.entry_hash;
}
