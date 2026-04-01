/**
 * Phase 11F — Predictive Governance Intelligence Layer. Types.
 * All objects are immutable.
 */

export type TrustLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED';

export interface TrustEvolutionPoint {
  readonly node_id: string;
  readonly organization_id: string;
  readonly trust_index: number;
  readonly trust_level: TrustLevel;
  readonly timestamp: number;
}

export type TrustStabilityStatus = 'STABLE' | 'VOLATILE' | 'DECLINING' | 'CRITICAL';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SYSTEMIC';

export interface PredictiveGovernanceSignal {
  readonly node_id: string;
  readonly organization_id: string;
  readonly stability_status: TrustStabilityStatus;
  readonly risk_level: RiskLevel;
  readonly trust_delta: number;
  readonly volatility_score: number;
  readonly evaluated_timestamp: number;
}

export interface FederationRiskReport {
  readonly total_nodes: number;
  readonly stable_nodes: number;
  readonly volatile_nodes: number;
  readonly declining_nodes: number;
  readonly critical_nodes: number;
  readonly systemic_risk_level: RiskLevel;
  readonly evaluated_timestamp: number;
}
