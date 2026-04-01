/**
 * Step 9C — Governance Historical Query Engine. Query hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceHistoricalQueryResult } from '../types/governance_historical_query_types.js';

/**
 * Deterministic hash of the query result.
 * Includes query_timestamp, snapshot_hash_at_time, reconstructed_snapshot_hash, and applied_diffs concatenation.
 */
export function computeGovernanceHistoricalQueryHash(
  result: GovernanceHistoricalQueryResult
): string {
  const appliedDiffsConcatenated =
    result.applied_diffs.length > 0 ? result.applied_diffs.join('') : '';
  return hashObjectDeterministic({
    query_timestamp: result.query_timestamp,
    snapshot_hash_at_time: result.snapshot_hash_at_time,
    reconstructed_snapshot_hash: result.reconstructed_snapshot_hash,
    applied_diffs: appliedDiffsConcatenated,
  });
}
