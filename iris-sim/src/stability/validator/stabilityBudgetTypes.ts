/**
 * Stability Step 3 — Stability Budget and Validator type definitions.
 * Global impact control, commit gatekeeper. No business logic change.
 */

export interface StabilityBudgetConfig {
  readonly maxGlobalImpactScorePerWindow: number;
  readonly maxSingleCommitImpact: number;
  readonly windowSizeMs: number;
  readonly cooldownMs: number;
}

export interface ImpactEstimate {
  readonly moduleName: string;
  readonly impactScore: number;
  readonly affectedKeys: readonly string[];
  readonly timestamp: number;
}

export interface ValidationResult {
  readonly approved: boolean;
  readonly reason?: string;
  readonly estimatedImpact: number;
}

export interface StabilityLedgerEntry {
  readonly moduleName: string;
  readonly impactScore: number;
  readonly approved: boolean;
  readonly timestamp: number;
}
