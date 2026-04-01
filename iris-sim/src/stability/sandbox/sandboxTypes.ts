/**
 * Stability Step 2 — Sandbox type definitions.
 * Modular AI sandboxing & isolation. No business logic change.
 */

export type SandboxStatus = 'active' | 'suspended' | 'terminated';

export interface ResourceBudgetConfig {
  readonly maxExecutionTimeMs: number;
  readonly maxDecisionsPerWindow: number;
  readonly maxStateWrites: number;
  readonly cooldownMs: number;
  readonly windowSizeMs?: number;
}

export interface SandboxMetrics {
  readonly executions: number;
  readonly suspensions: number;
  readonly terminations: number;
  readonly budgetViolations: number;
  readonly averageExecutionTime: number;
}

export interface SandboxedModuleRegistration {
  readonly moduleName: string;
  readonly resourceBudgetConfig: ResourceBudgetConfig;
}

export interface CommitRequest {
  readonly sandboxId: string;
  readonly localKey: string;
  readonly value: unknown;
  readonly timestamp: number;
}
