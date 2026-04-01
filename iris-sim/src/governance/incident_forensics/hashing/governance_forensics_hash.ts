/**
 * Step 9E — Governance Incident Forensics Engine. Deterministic report hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceIncidentForensicReport } from '../types/governance_forensics_types.js';

/**
 * Compute deterministic hash of the forensic report.
 */
export function computeGovernanceForensicHash(
  report: GovernanceIncidentForensicReport
): string {
  return hashObjectDeterministic({
    incident_timestamp: report.incident_timestamp,
    snapshot_hash_at_incident: report.snapshot_hash_at_incident,
    related_events: report.related_events,
  });
}
