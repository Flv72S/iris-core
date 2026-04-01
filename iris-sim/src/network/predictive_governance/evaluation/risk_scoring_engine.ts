/**
 * Phase 11F — Risk Scoring Engine. Deterministic risk score and level.
 */

import type { TrustCertificateLevel } from '../../trust_certification/types/trust_certificate_types.js';
import type { NodeRiskLevel } from '../types/risk_forecast_types.js';

const WEIGHT_TRUST = 0.5;
const WEIGHT_DRIFT = 0.4;
const WEIGHT_CERT = 0.1;

const PENALTY_GOLD = 0;
const PENALTY_SILVER = 0.2;
const PENALTY_BRONZE = 0.4;
const PENALTY_NULL = 0.6;

const THRESHOLD_CRITICAL = 0.8;
const THRESHOLD_HIGH = 0.6;
const THRESHOLD_MEDIUM = 0.3;

function certificatePenalty(level: TrustCertificateLevel | null): number {
  if (level === 'GOLD') return PENALTY_GOLD;
  if (level === 'SILVER') return PENALTY_SILVER;
  if (level === 'BRONZE') return PENALTY_BRONZE;
  return PENALTY_NULL;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Compute node risk score from trust index, certificate level, and drift severity.
 * Formula: (1 - trustIndex)*0.5 + driftSeverity*0.4 + certificatePenalty*0.1, clamped [0,1].
 */
export function computeNodeRiskScore(
  trustIndex: number,
  certificateLevel: TrustCertificateLevel | null,
  driftSeverity: number
): number {
  const term1 = (1 - clamp01(trustIndex)) * WEIGHT_TRUST;
  const term2 = clamp01(driftSeverity) * WEIGHT_DRIFT;
  const term3 = certificatePenalty(certificateLevel) * WEIGHT_CERT;
  return clamp01(term1 + term2 + term3);
}

/**
 * Classify risk level from risk score.
 */
export function classifyRiskLevel(riskScore: number): NodeRiskLevel {
  if (riskScore >= THRESHOLD_CRITICAL) return 'CRITICAL';
  if (riskScore >= THRESHOLD_HIGH) return 'HIGH';
  if (riskScore >= THRESHOLD_MEDIUM) return 'MEDIUM';
  return 'LOW';
}
