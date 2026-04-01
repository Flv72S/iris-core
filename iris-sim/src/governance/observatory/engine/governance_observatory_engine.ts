/**
 * Step 9F — Governance Observatory. Engine.
 */

import type {
  GovernanceObservatoryEvent,
  GovernanceObservatoryInput,
  GovernanceObservatoryReport,
} from '../types/governance_observatory_types.js';
import { computeGovernanceObservatoryHash } from '../hashing/governance_observatory_hash.js';

/**
 * Build an observatory report by aggregating timeline, compliance, and forensic events.
 * Events are sorted by timestamp. Does not mutate input.
 */
export function buildGovernanceObservatoryReport(
  input: GovernanceObservatoryInput
): GovernanceObservatoryReport {
  const events: GovernanceObservatoryEvent[] = [];

  for (const e of input.timeline.events) {
    events.push(
      Object.freeze({
        event_type: e.type,
        event_hash: e.hash,
        timestamp: e.timestamp,
      })
    );
  }

  for (const r of input.compliance_reports) {
    events.push(
      Object.freeze({
        event_type: 'compliance_check',
        event_hash: r.compliance_hash,
        timestamp: r.timestamp,
      })
    );
  }

  for (const r of input.forensic_reports) {
    events.push(
      Object.freeze({
        event_type: 'incident_analysis',
        event_hash: r.forensic_hash,
        timestamp: r.incident_timestamp,
      })
    );
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  const timeline_hash = input.timeline.timeline_hash;
  const total_events = events.length;
  const observatory_events = Object.freeze(events);

  const report: GovernanceObservatoryReport = {
    timeline_hash,
    total_events,
    observatory_events,
    observatory_hash: '', // set below
  };

  const observatory_hash = computeGovernanceObservatoryHash(report);

  return Object.freeze({
    ...report,
    observatory_hash,
  });
}
