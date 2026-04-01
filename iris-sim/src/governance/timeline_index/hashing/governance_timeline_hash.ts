/**
 * Step 9B — Governance Timeline Index. Deterministic timeline hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceTimeline } from '../types/governance_timeline_types.js';

/**
 * Compute deterministic hash of the timeline (genesis_snapshot_hash + events in order).
 */
export function computeGovernanceTimelineHash(timeline: GovernanceTimeline): string {
  return hashObjectDeterministic({
    genesis_snapshot_hash: timeline.genesis_snapshot_hash,
    events: timeline.events,
  });
}
