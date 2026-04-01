/**
 * Step 9E — Governance Incident Forensics Engine. Verifier.
 */

import type {
  GovernanceIncidentForensicReport,
  GovernanceIncidentInput,
} from '../types/governance_forensics_types.js';
import { analyzeGovernanceIncident } from '../engine/governance_forensics_engine.js';

/**
 * Verify a forensic report by re-running the analysis and comparing forensic_hash and fields.
 */
export function verifyGovernanceForensicReport(
  input: GovernanceIncidentInput,
  report: GovernanceIncidentForensicReport
): boolean {
  try {
    const expected = analyzeGovernanceIncident(input);
    if (report.forensic_hash !== expected.forensic_hash) return false;
    if (report.incident_timestamp !== expected.incident_timestamp) return false;
    if (report.snapshot_hash_at_incident !== expected.snapshot_hash_at_incident) return false;
    if (report.related_events.length !== expected.related_events.length) return false;
    for (let i = 0; i < report.related_events.length; i++) {
      const a = report.related_events[i]!;
      const b = expected.related_events[i]!;
      if (
        a.event_hash !== b.event_hash ||
        a.event_type !== b.event_type ||
        a.timestamp !== b.timestamp
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
