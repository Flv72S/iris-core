/**
 * Step 9C — Governance Historical Query Engine. Verifier.
 */

import type {
  GovernanceHistoricalQueryInput,
  GovernanceHistoricalQueryResult,
} from '../types/governance_historical_query_types.js';
import { queryGovernanceAtTimestamp } from '../engine/governance_historical_query_engine.js';

/**
 * Verify a historical query result by re-running the query and comparing hashes and applied_diffs.
 */
export function verifyGovernanceHistoricalQuery(
  input: GovernanceHistoricalQueryInput,
  result: GovernanceHistoricalQueryResult
): boolean {
  try {
    const expected = queryGovernanceAtTimestamp(input);
    return (
      result.query_timestamp === expected.query_timestamp &&
      result.snapshot_hash_at_time === expected.snapshot_hash_at_time &&
      result.reconstructed_snapshot_hash === expected.reconstructed_snapshot_hash &&
      result.query_hash === expected.query_hash &&
      result.applied_diffs.length === expected.applied_diffs.length &&
      result.applied_diffs.every((h, i) => h === expected.applied_diffs[i])
    );
  } catch {
    return false;
  }
}
