/**
 * Phase 11C — Cross-Tenant SLA Coordinator facade.
 * Pipeline: aggregate → gaps → [drift] → [weighted SLA] → [SLA consensus verification] → report → hash.
 */

import type { ConsensusResult } from '../node_consensus/types/consensus_engine_types.js';
import type { FederatedSLAReport, LocalNodeSLA } from './types/cross_tenant_sla_types.js';
import type { SLAMetricSnapshot } from './drift/sla_drift_types.js';
import type { NodeTrustScore } from './trust/sla_trust_types.js';
import { aggregateTenantStates } from './aggregation/sla_aggregation_engine.js';
import { evaluateTenantSLAs } from './evaluation/sla_evaluation_engine.js';
import { generateSlaAlerts } from './alerts/sla_alert_engine.js';
import { buildFederatedSlaReport } from './report/federated_sla_report_generator.js';
import { detectMetricDrift } from './drift/sla_drift_detector.js';
import { computeWeightedTenantSla } from './trust/sla_trust_weighted_aggregation.js';
import { verifySlaConsensusAlignment } from './verification/sla_consensus_verifier.js';

export function runCrossTenantSlaCoordinator(
  nodeSlas: LocalNodeSLA[],
  metricSnapshots?: readonly SLAMetricSnapshot[],
  trustScores?: readonly NodeTrustScore[],
  consensusResult?: ConsensusResult
): FederatedSLAReport {
  const ordered = [...nodeSlas].sort(
    (a, b) =>
      a.tenant_id.localeCompare(b.tenant_id) ||
      a.service_name.localeCompare(b.service_name) ||
      a.node_id.localeCompare(b.node_id)
  );

  const timestamp =
    ordered.length === 0 ? 0 : Math.max(...ordered.map((s) => s.timestamp));

  const tenantStates = aggregateTenantStates(ordered);
  const gaps = evaluateTenantSLAs(ordered, tenantStates);
  const alerts = generateSlaAlerts(gaps);

  const drift_signals =
    metricSnapshots !== undefined && metricSnapshots.length > 0
      ? detectMetricDrift([...metricSnapshots].sort((a, b) => a.timestamp - b.timestamp || a.node_id.localeCompare(b.node_id)))
      : undefined;

  const weighted_service_slas =
    trustScores !== undefined && trustScores.length > 0
      ? computeWeightedTenantSla(ordered, trustScores)
      : undefined;

  const sla_consensus_check =
    consensusResult !== undefined
      ? verifySlaConsensusAlignment(consensusResult, ordered)
      : undefined;

  return buildFederatedSlaReport(tenantStates, alerts, timestamp, drift_signals, weighted_service_slas, sla_consensus_check);
}

