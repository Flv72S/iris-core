/**
 * Phase 11C — SLA Alert Engine.
 * Converts detected gaps into deterministic severity classification.
 */

import type { SLAComplianceGap, SLAGapSeverity } from '../types/cross_tenant_sla_types.js';

export function classifyGapSeverity(gap: SLAComplianceGap): SLAGapSeverity {
  switch (gap.gap_type) {
    case 'SLA_CONFLICT':
      return 'WARNING';
    case 'NODE_MISSING_SLA':
      return 'WARNING';
    case 'UPTIME_BELOW_THRESHOLD':
    case 'LATENCY_EXCEEDS_TARGET':
      return 'CRITICAL';
    default:
      return 'INFO';
  }
}

export function generateSlaAlerts(gaps: readonly SLAComplianceGap[]): SLAComplianceGap[] {
  return gaps
    .map((g) =>
      Object.freeze({
        ...g,
        severity: classifyGapSeverity(g),
      })
    )
    .sort((a, b) => a.tenant_id.localeCompare(b.tenant_id) || a.service_name.localeCompare(b.service_name) || a.gap_type.localeCompare(b.gap_type));
}

