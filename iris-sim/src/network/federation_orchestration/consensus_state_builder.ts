/**
 * Phase 11H — Consensus state builder. Aggregates governance outputs (read-only).
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { FederatedTrustCertificate } from '../trust_certification/types/trust_certificate_types.js';
import type { PredictiveGovernanceSignal } from '../predictive_governance/predictive_governance_types.js';
import type { GlobalAuditReport } from '../governance_audit/audit_types.js';
import type { FederationConsensusState, RiskLevel } from './federation_orchestration_types.js';
import { computeFederationRisk } from '../predictive_governance/federation_risk_monitor.js';

/**
 * Build federation consensus state from orchestrated inputs. Read-only, deterministic.
 */
export function buildFederationConsensusState(
  trust_indices: readonly NodeTrustIndex[],
  certificates: readonly FederatedTrustCertificate[],
  predictive_signals: readonly PredictiveGovernanceSignal[],
  audit_report: GlobalAuditReport
): FederationConsensusState {
  const trust_nodes = trust_indices.length;
  const certified_nodes = certificates.length;
  const predictive_signals_count = predictive_signals.length;
  const audit_passed_nodes = audit_report.passed_nodes;

  const timestamp =
    predictive_signals.length > 0
      ? predictive_signals[0].evaluated_timestamp
      : audit_report.audit_timestamp;
  const federationRisk = computeFederationRisk(predictive_signals, timestamp);
  const systemic_risk_level: RiskLevel = federationRisk.systemic_risk_level;

  return Object.freeze({
    trust_nodes,
    certified_nodes,
    predictive_signals: predictive_signals_count,
    audit_passed_nodes,
    systemic_risk_level,
  });
}
