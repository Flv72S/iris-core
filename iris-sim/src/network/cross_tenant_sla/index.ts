/**
 * Phase 11C — Cross-Tenant SLA Coordinator.
 */

export type {
  LocalNodeSLA,
  TenantSLAState,
  TenantServiceSLA,
  SLAComplianceGap,
  FederatedSLAReport,
  SLAGapType,
  SLAGapSeverity,
} from './types/cross_tenant_sla_types.js';

export {
  groupSLAsByTenant,
  groupSLAsByService,
  aggregateTenantServiceSLAs,
  aggregateTenantStates,
} from './aggregation/sla_aggregation_engine.js';

export {
  evaluateTenantSLAs,
  detectSlaConflicts,
  detectMissingSlaNodes,
} from './evaluation/sla_evaluation_engine.js';

export { generateSlaAlerts, classifyGapSeverity } from './alerts/sla_alert_engine.js';

export {
  buildFederatedSlaReport,
  calculateFederatedSlaHash,
  verifyFederatedSlaReport,
} from './report/federated_sla_report_generator.js';

export { runCrossTenantSlaCoordinator } from './cross_tenant_sla_coordinator.js';

/** Phase 11C.1 — SLA Drift Detection */
export type {
  SLAMetricSnapshot,
  SLADriftSignal,
  SLADriftMetric,
  SLADriftDirection,
  SLADriftSeverity,
} from './drift/sla_drift_types.js';
export {
  buildServiceMetricHistory,
  calculateMetricSlope,
  detectMetricDrift,
} from './drift/sla_drift_detector.js';
export {
  classifyDriftSeverity,
  DRIFT_SEVERITY_LOW_THRESHOLD,
  DRIFT_SEVERITY_MEDIUM_THRESHOLD,
} from './drift/sla_drift_classifier.js';

/** Phase 11C.2 — SLA Trust Weighting */
export type { NodeTrustScore, WeightedServiceSLA } from './trust/sla_trust_types.js';
export { normalizeTrustScores, buildNodeTrustMap, weightsForNodes } from './trust/sla_trust_weight_engine.js';
export {
  groupSlasByTenantService,
  computeWeightedServiceSla,
  computeWeightedTenantSla,
} from './trust/sla_trust_weighted_aggregation.js';

/** Phase 11C.3 — SLA Consensus Verification */
export type { SLAConsensusCheckResult, SLAConsensusDiagnostics, SLAConsensusVerificationStatus } from './verification/sla_consensus_types.js';
export { verifySlaConsensusAlignment, extractConsensusNodeIds, extractSlaNodeIds } from './verification/sla_consensus_verifier.js';
export { buildSlaConsensusDiagnostics } from './verification/sla_consensus_diagnostics.js';

