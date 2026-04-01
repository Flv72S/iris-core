/**
 * Phase 11H — Federation execution coordinator. Orchestrates consensus pipeline (read-only).
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { FederatedTrustCertificate } from '../trust_certification/types/trust_certificate_types.js';
import type { PredictiveGovernanceSignal } from '../predictive_governance/predictive_governance_types.js';
import type { GlobalAuditReport } from '../governance_audit/audit_types.js';
import type {
  FederationConsensusSnapshot,
  FederationNotification,
  FederationExecutionStage,
} from './federation_orchestration_types.js';
import { GOVERNANCE_EXECUTION_ORDER } from './governance_execution_stage.js';
import { buildFederationTimeline } from './federation_timeline_manager.js';
import { generateFederationNotifications } from './federation_state_notifier.js';
import { buildFederationConsensusState } from './consensus_state_builder.js';

const FULL_STAGE_ORDER: readonly FederationExecutionStage[] = GOVERNANCE_EXECUTION_ORDER;

/**
 * Run federation consensus orchestration. Read-only, deterministic.
 * Returns snapshot and notifications; does not mutate inputs.
 */
export function runFederationConsensusOrchestration(
  trust_indices: readonly NodeTrustIndex[],
  certificates: readonly FederatedTrustCertificate[],
  predictive_signals: readonly PredictiveGovernanceSignal[],
  audit_report: GlobalAuditReport,
  timestamp: number
): { snapshot: FederationConsensusSnapshot; notifications: readonly FederationNotification[] } {
  const stages = [...FULL_STAGE_ORDER];
  const timeline = buildFederationTimeline(stages, timestamp);
  const consensus_state = buildFederationConsensusState(
    trust_indices,
    certificates,
    predictive_signals,
    audit_report
  );
  const notifications = generateFederationNotifications(timeline);

  const snapshot: FederationConsensusSnapshot = Object.freeze({
    timeline: Object.freeze([...timeline]),
    consensus_state,
    finalized: true,
    timestamp,
  });

  return {
    snapshot,
    notifications: Object.freeze([...notifications]),
  };
}
