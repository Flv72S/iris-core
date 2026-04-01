/**
 * Step 7E — Governance Observatory. Risk detector (read-only, deterministic).
 */

import type { GovernanceSnapshot } from './GovernanceSnapshot.js';

export type GovernanceRiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface GovernanceRisk {
  readonly type: string;
  readonly severity: GovernanceRiskSeverity;
  readonly detectedAt: number;
  readonly description: string;
}

const DRIFT_ENTROPY_THRESHOLD = 0.7;
const CONSENSUS_COLLAPSE_THRESHOLD = 0.3;
const OVERRIDE_EXPLOSION_THRESHOLD = 0.5;
const STRESS_CRITICAL_THRESHOLD = 0.8;
const DECISION_SATURATION_THRESHOLD = 0.9;

export class GovernanceRiskDetector {
  detectRisks(timeline: readonly GovernanceSnapshot[]): GovernanceRisk[] {
    const risks: GovernanceRisk[] = [];
    if (timeline.length === 0) return risks;

    const latest = timeline[timeline.length - 1]!;
    const ts = latest.timestamp;

    if (latest.governanceEntropy > DRIFT_ENTROPY_THRESHOLD) {
      risks.push({
        type: 'Governance Drift',
        severity: latest.governanceEntropy > 0.9 ? 'high' : 'medium',
        detectedAt: ts,
        description: 'Governance entropy above drift threshold',
      });
    }

    if (latest.consensusRate < CONSENSUS_COLLAPSE_THRESHOLD) {
      risks.push({
        type: 'Consensus Collapse',
        severity: latest.consensusRate < 0.15 ? 'critical' : 'high',
        detectedAt: ts,
        description: 'Consensus rate below collapse threshold',
      });
    }

    const tierKeys = Object.keys(latest.tierDistribution);
    if (tierKeys.length > 0) {
      const maxShare = Math.max(
        ...tierKeys.map((k) => latest.tierDistribution[k] ?? 0)
      );
      const total = tierKeys.reduce(
        (s, k) => s + (latest.tierDistribution[k] ?? 0),
        0
      );
      const maxPct = total > 0 ? maxShare / total : 0;
      if (maxPct > 0.95) {
        risks.push({
          type: 'Tier Imbalance',
          severity: 'medium',
          detectedAt: ts,
          description: 'Tier distribution heavily concentrated',
        });
      }
    }

    if (latest.stabilityIndex < 0.4 && latest.systemStress > 0.5) {
      risks.push({
        type: 'SLA Overpressure',
        severity: latest.systemStress > STRESS_CRITICAL_THRESHOLD ? 'high' : 'medium',
        detectedAt: ts,
        description: 'Stability low with elevated system stress',
      });
    }

    if (latest.decisionLoad > DECISION_SATURATION_THRESHOLD) {
      risks.push({
        type: 'Decision Saturation',
        severity: latest.decisionLoad > 0.98 ? 'high' : 'low',
        detectedAt: ts,
        description: 'Decision load near saturation',
      });
    }

    if (latest.overrideRate > OVERRIDE_EXPLOSION_THRESHOLD) {
      risks.push({
        type: 'Override Explosion',
        severity: latest.overrideRate > 0.8 ? 'critical' : 'high',
        detectedAt: ts,
        description: 'Override rate above safe threshold',
      });
    }

    return risks;
  }
}
