/**
 * Step 9B — Governance Timeline Index. Verifier.
 */

import type { GovernanceTimeline } from '../types/governance_timeline_types.js';
import { computeGovernanceTimelineHash } from '../hashing/governance_timeline_hash.js';

/**
 * Verify timeline: recompute hash and check ascending timestamps.
 */
export function verifyGovernanceTimeline(timeline: GovernanceTimeline): boolean {
  const computed = computeGovernanceTimelineHash(timeline);
  if (computed !== timeline.timeline_hash) return false;

  for (let i = 1; i < timeline.events.length; i++) {
    if (timeline.events[i]!.timestamp < timeline.events[i - 1]!.timestamp) return false;
  }
  return true;
}
