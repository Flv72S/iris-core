/**
 * Step 9B — Governance Timeline Index. Builder.
 */

import type {
  GovernanceTimeline,
  GovernanceTimelineEvent,
  GovernanceTimelineInput,
} from '../types/governance_timeline_types.js';
import { computeGovernanceTimelineHash } from '../hashing/governance_timeline_hash.js';

/**
 * Build a governance timeline from genesis snapshot and ordered diffs.
 * Events are sorted by timestamp ascending. Does not mutate input.
 */
export function buildGovernanceTimeline(input: GovernanceTimelineInput): GovernanceTimeline {
  const genesis = input.genesis_snapshot;
  const genesis_snapshot_hash = genesis.global_hash;

  const events: GovernanceTimelineEvent[] = [
    Object.freeze({
      type: 'snapshot',
      hash: genesis_snapshot_hash,
      timestamp: genesis.timestamp,
    }),
  ];

  for (const diff of input.diffs) {
    events.push(
      Object.freeze({
        type: 'diff',
        hash: diff.diff_hash,
        timestamp: diff.timestamp,
      })
    );
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  const timeline: GovernanceTimeline = Object.freeze({
    genesis_snapshot_hash,
    events: Object.freeze(events),
    timeline_hash: '', // set below after freeze of events
  });

  const timeline_hash = computeGovernanceTimelineHash({
    ...timeline,
    timeline_hash: '',
  });

  return Object.freeze({
    genesis_snapshot_hash,
    events: timeline.events,
    timeline_hash,
  });
}
