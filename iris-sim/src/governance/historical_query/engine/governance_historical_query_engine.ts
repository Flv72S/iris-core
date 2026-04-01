/**
 * Step 9C — Governance Historical Query Engine.
 */

import type {
  GovernanceHistoricalQueryInput,
  GovernanceHistoricalQueryResult,
} from '../types/governance_historical_query_types.js';
import { getTimelineEventsUntil } from '../../timeline_index/query/governance_timeline_query.js';
import { replayGovernanceHistory } from '../../replay_engine/engine/governance_replay_engine.js';
import { computeGovernanceHistoricalQueryHash } from '../hashing/governance_historical_query_hash.js';

/**
 * Query governance state at a given timestamp using timeline and replay.
 * Returns the reconstructed snapshot hash and applied diff hashes. Does not mutate input.
 */
export function queryGovernanceAtTimestamp(
  input: GovernanceHistoricalQueryInput
): GovernanceHistoricalQueryResult {
  const eventsUntil = getTimelineEventsUntil(input.timeline, input.timestamp);
  const diffHashesUntil = new Set(
    eventsUntil.filter((e) => e.type === 'diff').map((e) => e.hash)
  );
  const applicableDiffs = input.diffs.filter((d) => diffHashesUntil.has(d.diff_hash));

  const replayResult = replayGovernanceHistory({
    base_snapshot: input.genesis_snapshot,
    diffs: applicableDiffs,
  });

  const query_timestamp = input.timestamp;
  const snapshot_hash_at_time = replayResult.final_snapshot_hash;
  const reconstructed_snapshot_hash = replayResult.final_snapshot_hash;
  const applied_diffs = replayResult.steps.map((s) => s.applied_diff_hash);

  const result: GovernanceHistoricalQueryResult = {
    query_timestamp,
    snapshot_hash_at_time,
    reconstructed_snapshot_hash,
    applied_diffs: Object.freeze([...applied_diffs]),
    query_hash: '', // set below
  };

  const query_hash = computeGovernanceHistoricalQueryHash(result);

  return Object.freeze({
    ...result,
    query_hash,
  });
}
