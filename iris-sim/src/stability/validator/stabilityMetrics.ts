/**
 * Stability Step 3 — Stability validator metrics.
 * totalCommitsValidated, approved/rejected, averageImpact, cumulativeImpact, cooldownActive.
 */

import type { StabilityValidator } from './stabilityValidator.js';

export interface StabilityValidatorMetrics {
  readonly totalCommitsValidated: number;
  readonly approvedCommits: number;
  readonly rejectedCommits: number;
  readonly averageImpactScore: number;
  readonly cumulativeImpactCurrentWindow: number;
  readonly cooldownActive: boolean;
}

export function collectStabilityValidatorMetrics(validator: StabilityValidator): StabilityValidatorMetrics {
  const now = Date.now();
  const ledger = validator.budgetController.ledger;
  const entries = ledger.getEntries();
  const total = entries.length;
  const approved = entries.filter((e) => e.approved).length;
  const rejected = entries.filter((e) => !e.approved).length;
  const totalImpact = entries.reduce((s, e) => s + e.impactScore, 0);
  const avgImpact = total > 0 ? totalImpact / total : 0;
  const cumulative = ledger.getCumulativeImpact(now);
  const cooldownActive = validator.budgetController.getStatus(now) === 'cooldown';

  return Object.freeze({
    totalCommitsValidated: total,
    approvedCommits: approved,
    rejectedCommits: rejected,
    averageImpactScore: avgImpact,
    cumulativeImpactCurrentWindow: cumulative,
    cooldownActive,
  });
}
