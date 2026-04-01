/**
 * Phase 11F — Risk Assessment Engine.
 * Maps stability status + volatility to risk level. Deterministic.
 */

import type { TrustStabilityStatus } from './predictive_governance_types.js';
import type { RiskLevel } from './predictive_governance_types.js';

const VOLATILITY_UPGRADE_THRESHOLD = 0.15;

const STABLE_TO_RISK: RiskLevel = 'LOW';
const VOLATILE_TO_RISK: RiskLevel = 'MODERATE';
const DECLINING_TO_RISK: RiskLevel = 'HIGH';
const CRITICAL_TO_RISK: RiskLevel = 'SYSTEMIC';

function upgradeOneLevel(level: RiskLevel): RiskLevel {
  if (level === 'SYSTEMIC') return 'SYSTEMIC';
  if (level === 'HIGH') return 'SYSTEMIC';
  if (level === 'MODERATE') return 'HIGH';
  return 'MODERATE';
}

/**
 * Assess node risk from stability status and volatility. Deterministic.
 */
export function assessNodeRisk(
  stability_status: TrustStabilityStatus,
  volatility_score: number
): RiskLevel {
  let level: RiskLevel;
  switch (stability_status) {
    case 'STABLE':
      level = STABLE_TO_RISK;
      break;
    case 'VOLATILE':
      level = VOLATILE_TO_RISK;
      break;
    case 'DECLINING':
      level = DECLINING_TO_RISK;
      break;
    case 'CRITICAL':
      level = CRITICAL_TO_RISK;
      break;
  }
  if (volatility_score > VOLATILITY_UPGRADE_THRESHOLD) {
    level = upgradeOneLevel(level);
  }
  return level;
}
