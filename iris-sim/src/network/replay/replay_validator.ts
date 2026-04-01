import { createHash } from 'node:crypto';
import type { ConsensusLogEntry } from '../consensus_log/index.js';
import { computeEntryHash } from '../consensus_log/index.js';
import type { DistributedState } from './replay_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function stableSerializeValue(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map((x) => stableSerializeValue(x)).join(',') + ']';
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableSerializeValue(obj[k]));
  return '{' + parts.join(',') + '}';
}

export class ReplayValidator {
  static validateHashChain(entries: ConsensusLogEntry[]): void {
    let prev: ConsensusLogEntry | null = null;
    for (const entry of entries) {
      // Verify entry hash itself (tamper detection)
      const { hash, ...withoutHash } = entry;
      const expectedHash = computeEntryHash(withoutHash);
      if (expectedHash !== hash) {
        throw new Error(`ReplayValidator: entry hash mismatch (id=${entry.id}).`);
      }
      // Verify chain linkage
      const expectedPrev = prev ? prev.hash : null;
      if (entry.previous_hash !== expectedPrev) {
        throw new Error(`ReplayValidator: hash chain broken at entry (id=${entry.id}).`);
      }
      prev = entry;
    }
  }

  static computeFinalHash(state: DistributedState): string {
    // Deterministic replay hash for audit: derived solely from the sequence of accepted outcomes.
    // We intentionally exclude fields that may be "expected" metadata (e.g. proposal diff_hash)
    // to avoid circular expectations (expected_hash must be independent from itself).
    return sha256Hex(
      stableSerializeValue({
        accepted_proposals: state.accepted_proposals,
        last_accepted_proposal_id: state.last_accepted_proposal_id,
      })
    );
  }

  static validateFinalState(state: DistributedState, expected_hash?: string): boolean {
    if (!expected_hash) return true;
    const actual = ReplayValidator.computeFinalHash(state);
    return actual === expected_hash;
  }
}

