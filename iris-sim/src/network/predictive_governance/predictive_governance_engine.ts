/**
 * Phase 11F — Predictive Governance Engine.
 * (1) Deterministic risk forecast from trust indices, certificates, and drift signals.
 * (2) Predictive governance intelligence: trust evolution, stability, federation risk.
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { FederatedTrustCertificate } from '../trust_certification/types/trust_certificate_types.js';
import type { SLADriftSignal } from '../cross_tenant_sla/drift/sla_drift_types.js';
import type { FederatedRiskForecast } from './types/risk_forecast_types.js';
import type { TrustEvolutionPoint, PredictiveGovernanceSignal, FederationRiskReport } from './predictive_governance_types.js';
import { generateRiskForecast } from './forecast/risk_forecast_generator.js';
import { analyzeTrustEvolution } from './trust_evolution_analyzer.js';
import { assessNodeRisk } from './risk_assessment_engine.js';
import { computeFederationRisk } from './federation_risk_monitor.js';

/**
 * Run the predictive governance engine. Returns deterministic risk forecast.
 */
export function runPredictiveGovernanceEngine(
  trustIndices: readonly NodeTrustIndex[],
  certificates: readonly FederatedTrustCertificate[],
  driftSignals: readonly SLADriftSignal[],
  timestamp: number
): FederatedRiskForecast {
  return generateRiskForecast(trustIndices, certificates, driftSignals, timestamp);
}

/**
 * Run predictive governance analysis: trust evolution, stability, node risk, federation risk.
 * Read-only intelligence layer; does not modify trust calculations or report hashes.
 */
export function runPredictiveGovernanceAnalysis(
  history_by_node: ReadonlyMap<string, readonly TrustEvolutionPoint[]>,
  timestamp: number
): { signals: PredictiveGovernanceSignal[]; federation_risk: FederationRiskReport } {
  const signals: PredictiveGovernanceSignal[] = [];
  const nodeIds = [...history_by_node.keys()].sort((a, b) => a.localeCompare(b));
  for (const node_id of nodeIds) {
    const history = history_by_node.get(node_id)!;
    const evo = analyzeTrustEvolution(history);
    const risk_level = assessNodeRisk(evo.stability_status, evo.volatility_score);
    const organization_id = history.length > 0 ? history[0]!.organization_id : '';
    signals.push(
      Object.freeze({
        node_id,
        organization_id,
        stability_status: evo.stability_status,
        risk_level,
        trust_delta: evo.trust_delta,
        volatility_score: evo.volatility_score,
        evaluated_timestamp: timestamp,
      })
    );
  }
  const federation_risk = computeFederationRisk(signals, timestamp);
  return { signals, federation_risk };
}
