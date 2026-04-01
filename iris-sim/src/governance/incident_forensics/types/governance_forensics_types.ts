/**
 * Step 9E — Governance Incident Forensics Engine. Types.
 */

import type { GovernanceTimeline } from '../../timeline_index/types/governance_timeline_types.js';
import type { GovernanceHistoricalQueryResult } from '../../historical_query/types/governance_historical_query_types.js';

export interface GovernanceIncidentInput {
  readonly incident_timestamp: number;
  readonly timeline: GovernanceTimeline;
  readonly historical_state: GovernanceHistoricalQueryResult;
}

export interface GovernanceForensicEvent {
  readonly event_hash: string;
  readonly event_type: 'snapshot' | 'diff';
  readonly timestamp: number;
}

export interface GovernanceIncidentForensicReport {
  readonly incident_timestamp: number;
  readonly snapshot_hash_at_incident: string;
  readonly related_events: readonly GovernanceForensicEvent[];
  readonly forensic_hash: string;
}
