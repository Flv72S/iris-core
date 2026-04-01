/**
 * Stability Step 3 — Central stability validator (gatekeeper).
 * Estimate impact, check budget, record ledger, return ValidationResult. No commit applied.
 */

import type { ValidationResult, StabilityBudgetConfig } from './stabilityBudgetTypes.js';
import { ImpactEstimator } from '../impact/impactEstimator.js';
import { StabilityBudgetController } from './stabilityBudget.js';
import type { CommitRequest } from '../sandbox/sandboxTypes.js';

export class StabilityValidator {
  readonly impactEstimator: ImpactEstimator;
  readonly budgetController: StabilityBudgetController;

  constructor(config: StabilityBudgetConfig) {
    this.impactEstimator = new ImpactEstimator();
    this.budgetController = new StabilityBudgetController(config);
  }

  validateCommit(
    moduleName: string,
    commitRequest: CommitRequest,
    previousState?: Readonly<Record<string, unknown>>
  ): ValidationResult {
    const now = Date.now();
    const estimate = this.impactEstimator.estimateImpact(moduleName, commitRequest, previousState);
    const canProcess = this.budgetController.canProcessImpact(estimate.impactScore, now);
    const approved = canProcess;

    this.budgetController.ledger.addEntry({
      moduleName,
      impactScore: estimate.impactScore,
      approved,
      timestamp: now,
    });
    if (!approved) {
      this.budgetController.registerImpact(estimate.impactScore, false, now);
    }

    const result: ValidationResult = approved
      ? { approved: true, estimatedImpact: estimate.impactScore }
      : {
          approved: false,
          reason:
            estimate.impactScore > this.budgetController.config.maxSingleCommitImpact
              ? 'single_commit_over_limit'
              : 'global_budget_exceeded',
          estimatedImpact: estimate.impactScore,
        };
    return Object.freeze(result);
  }

  validateSandboxCommit(
    moduleName: string,
    commitRequest: CommitRequest,
    previousState?: Readonly<Record<string, unknown>>
  ): ValidationResult {
    return this.validateCommit(moduleName, commitRequest, previousState);
  }
}
