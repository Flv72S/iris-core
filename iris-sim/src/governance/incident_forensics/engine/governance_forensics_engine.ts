/**
 * Step 9E — Governance Incident Forensics Engine.
 */

import type {
  GovernanceForensicEvent,
  GovernanceIncidentForensicReport,
  GovernanceIncidentInput,
} from '../types/governance_forensics_types.js';
import { getTimelineEventsUntil } from '../../timeline_index/query/governance_timeline_query.js';
import { computeGovernanceForensicHash } from '../hashing/governance_forensics_hash.js';

/**
 * Analyze a governance incident: extract events until incident_timestamp and build a forensic report.
 * Does not mutate input. Events are ordered by timestamp.
 */
export function analyzeGovernanceIncident(
  input: GovernanceIncidentInput
): GovernanceIncidentForensicReport {
  const eventsUntil = getTimelineEventsUntil(input.timeline, input.incident_timestamp);
  const related_events: GovernanceForensicEvent[] = eventsUntil
    .map((e) =>
      Object.freeze({
        event_hash: e.hash,
        event_type: e.type,
        timestamp: e.timestamp,
      })
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  const incident_timestamp = input.incident_timestamp;
  const snapshot_hash_at_incident = input.historical_state.reconstructed_snapshot_hash;

  const report: GovernanceIncidentForensicReport = {
    incident_timestamp,
    snapshot_hash_at_incident,
    related_events: Object.freeze(related_events),
    forensic_hash: '', // set below
  };

  const forensic_hash = computeGovernanceForensicHash(report);

  return Object.freeze({
    ...report,
    forensic_hash,
  });
}
