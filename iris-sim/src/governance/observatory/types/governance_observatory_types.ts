/**
 * Step 9F — Governance Observatory. Types.
 */

import type { GovernanceTimeline } from '../../timeline_index/types/governance_timeline_types.js';
import type { GovernanceComplianceReport } from '../../compliance_auditor/types/governance_compliance_types.js';
import type { GovernanceIncidentForensicReport } from '../../incident_forensics/types/governance_forensics_types.js';

export interface GovernanceObservatoryInput {
  readonly timeline: GovernanceTimeline;
  readonly compliance_reports: readonly GovernanceComplianceReport[];
  readonly forensic_reports: readonly GovernanceIncidentForensicReport[];
}

export interface GovernanceObservatoryEvent {
  readonly event_type: 'snapshot' | 'diff' | 'compliance_check' | 'incident_analysis';
  readonly event_hash: string;
  readonly timestamp: number;
}

export interface GovernanceObservatoryReport {
  readonly timeline_hash: string;
  readonly total_events: number;
  readonly observatory_events: readonly GovernanceObservatoryEvent[];
  readonly observatory_hash: string;
}
