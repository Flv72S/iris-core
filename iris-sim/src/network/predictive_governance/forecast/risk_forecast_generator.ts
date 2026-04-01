/**
 * Phase 11F — Risk Forecast Generator. Deterministic forecast and hash.
 */

import { createHash } from 'node:crypto';
import type { NodeTrustIndex } from '../../inter_org_trust/types/trust_types.js';
import type { FederatedTrustCertificate } from '../../trust_certification/types/trust_certificate_types.js';
import type { SLADriftSignal } from '../../cross_tenant_sla/drift/sla_drift_types.js';
import type { FederatedRiskForecast, NodeRiskForecast } from '../types/risk_forecast_types.js';
import type { TrustCertificateLevel } from '../../trust_certification/types/trust_certificate_types.js';
import { computeDriftSeverityScore, type DriftSignalWithNode } from '../evaluation/risk_trend_analysis.js';
import { computeNodeRiskScore, classifyRiskLevel } from '../evaluation/risk_scoring_engine.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Generate federated risk forecast. Nodes sorted by node_id; hash over deterministic payload.
 */
export function generateRiskForecast(
  trustIndices: readonly NodeTrustIndex[],
  certificates: readonly FederatedTrustCertificate[],
  driftSignals: readonly SLADriftSignal[],
  timestamp: number
): FederatedRiskForecast {
  const certByNode = new Map<string, FederatedTrustCertificate>();
  for (const c of certificates) certByNode.set(c.node_id, c);
  const signals = driftSignals as readonly DriftSignalWithNode[];

  const sortedNodes = [...trustIndices].sort((a, b) => a.node_id.localeCompare(b.node_id));
  const nodeForecasts: NodeRiskForecast[] = [];

  for (const ti of sortedNodes) {
    const cert = certByNode.get(ti.node_id) ?? null;
    const certLevel: TrustCertificateLevel | null = cert ? cert.certificate_level : null;
    const driftSeverity = computeDriftSeverityScore(ti.node_id, signals);
    const riskScore = computeNodeRiskScore(ti.trust_index, certLevel, driftSeverity);
    const riskLevel = classifyRiskLevel(riskScore);
    nodeForecasts.push(
      Object.freeze({
        node_id: ti.node_id,
        organization_id: ti.organization_id,
        trust_index: ti.trust_index,
        certificate_level: certLevel,
        drift_severity_score: driftSeverity,
        risk_score: riskScore,
        risk_level: riskLevel,
      })
    );
  }

  const average_risk_score =
    nodeForecasts.length === 0 ? 0 : nodeForecasts.reduce((s, n) => s + n.risk_score, 0) / nodeForecasts.length;
  const sortedByRisk = [...nodeForecasts].sort(
    (a, b) => b.risk_score - a.risk_score || a.node_id.localeCompare(b.node_id)
  );
  const highest_risk_node = nodeForecasts.length === 0 ? '' : sortedByRisk[0].node_id;

  const payload = {
    timestamp,
    node_risk_forecasts: nodeForecasts,
    highest_risk_node,
    average_risk_score,
  };
  const forecast_hash = sha256Hex(stableStringify(payload));

  return Object.freeze({
    timestamp,
    node_risk_forecasts: nodeForecasts,
    highest_risk_node,
    average_risk_score,
    forecast_hash,
  });
}
