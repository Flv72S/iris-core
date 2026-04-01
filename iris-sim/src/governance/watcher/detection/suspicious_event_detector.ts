/**
 * Step 8L — Suspicious event detector. Policy change + runtime decision in short window.
 */

import { createGovernanceAlert } from '../types/governance_alert.js';
import type { GovernanceAlert } from '../types/governance_alert.js';

export interface GovernanceEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly payload?: unknown;
}

const WINDOW_MS = 10_000; // 10 seconds

/**
 * If we have policy_change and runtime_decision events within 10s, generate SUSPICIOUS_ACTIVITY.
 */
export function detectSuspiciousEvents(events: readonly GovernanceEvent[]): GovernanceAlert[] {
  const alerts: GovernanceAlert[] = [];
  const policyChange = events.find((e) => e.type === 'policy_change');
  const runtimeDecision = events.find((e) => e.type === 'runtime_decision');
  if (policyChange !== undefined && runtimeDecision !== undefined) {
    const delta = Math.abs(runtimeDecision.timestamp - policyChange.timestamp);
    if (delta < WINDOW_MS) {
      alerts.push(
        createGovernanceAlert(
          'SUSPICIOUS_ACTIVITY',
          'MEDIUM',
          'Policy change and runtime decision within 10s window'
        )
      );
    }
  }
  return alerts;
}
