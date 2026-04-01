/**
 * Stability Step 4 — Commit pipeline metrics.
 */

import type { ControlledCommitPipeline } from './commitPipeline.js';

export interface CommitPipelineMetrics {
  readonly totalCommitsProcessed: number;
  readonly totalCommitsApplied: number;
  readonly totalCommitsRejected: number;
  readonly averageImpactApplied: number;
  readonly rejectionRatio: number;
}

export function collectCommitPipelineMetrics(pipeline: ControlledCommitPipeline): CommitPipelineMetrics {
  const applied = pipeline.applicationHistory.filter((r) => r.applied).length;
  const validatorMetrics = pipeline.validator.budgetController.ledger.getEntries();
  const total = validatorMetrics.length;
  const rejected = validatorMetrics.filter((e) => !e.approved).length;

  const appliedRecords = pipeline.applicationHistory.filter((r) => r.applied);
  const totalImpactApplied = appliedRecords.reduce((s, r) => s + r.impactScore, 0);
  const averageImpactApplied = appliedRecords.length > 0 ? totalImpactApplied / appliedRecords.length : 0;
  const rejectionRatio = total > 0 ? rejected / total : 0;

  return Object.freeze({
    totalCommitsProcessed: total,
    totalCommitsApplied: applied,
    totalCommitsRejected: rejected,
    averageImpactApplied,
    rejectionRatio,
  });
}
