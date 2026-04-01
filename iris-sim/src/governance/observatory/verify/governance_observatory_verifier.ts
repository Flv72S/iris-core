/**
 * Step 9F — Governance Observatory. Verifier.
 */

import type {
  GovernanceObservatoryInput,
  GovernanceObservatoryReport,
} from '../types/governance_observatory_types.js';
import { buildGovernanceObservatoryReport } from '../engine/governance_observatory_engine.js';

/**
 * Verify an observatory report by re-running the build and comparing observatory_hash and fields.
 */
export function verifyGovernanceObservatoryReport(
  input: GovernanceObservatoryInput,
  report: GovernanceObservatoryReport
): boolean {
  try {
    const expected = buildGovernanceObservatoryReport(input);
    if (report.observatory_hash !== expected.observatory_hash) return false;
    if (report.timeline_hash !== expected.timeline_hash) return false;
    if (report.total_events !== expected.total_events) return false;
    if (report.observatory_events.length !== expected.observatory_events.length) return false;
    for (let i = 0; i < report.observatory_events.length; i++) {
      const a = report.observatory_events[i]!;
      const b = expected.observatory_events[i]!;
      if (
        a.event_type !== b.event_type ||
        a.event_hash !== b.event_hash ||
        a.timestamp !== b.timestamp
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
