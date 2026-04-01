/**
 * Step 9F — Governance Observatory. Deterministic report hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceObservatoryReport } from '../types/governance_observatory_types.js';

/**
 * Compute deterministic hash of the observatory report.
 */
export function computeGovernanceObservatoryHash(
  report: GovernanceObservatoryReport
): string {
  return hashObjectDeterministic({
    timeline_hash: report.timeline_hash,
    total_events: report.total_events,
    observatory_events: report.observatory_events,
  });
}
