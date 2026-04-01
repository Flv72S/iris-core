/**
 * Phase 11F — Predictive Governance. Risk forecast types.
 * All objects are immutable.
 */

export type NodeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NodeRiskForecast {
  readonly node_id: string;
  readonly organization_id: string;
  readonly trust_index: number;
  readonly certificate_level: 'GOLD' | 'SILVER' | 'BRONZE' | null;
  readonly drift_severity_score: number;
  readonly risk_score: number;
  readonly risk_level: NodeRiskLevel;
}

export interface FederatedRiskForecast {
  readonly timestamp: number;
  readonly node_risk_forecasts: readonly NodeRiskForecast[];
  readonly highest_risk_node: string;
  readonly average_risk_score: number;
  readonly forecast_hash: string;
}
