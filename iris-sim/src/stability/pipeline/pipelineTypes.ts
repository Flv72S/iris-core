/**
 * Stability Step 4 — Controlled commit pipeline type definitions.
 * Sandbox to Validator to Adapter flow. No real global state.
 */

export interface PipelineResult {
  readonly applied: boolean;
  readonly rejected: boolean;
  readonly reason?: string;
  readonly impactScore: number;
}

export type GlobalStateSnapshot = Readonly<Record<string, unknown>>;

export interface CommitApplicationRecord {
  readonly moduleName: string;
  readonly applied: boolean;
  readonly impactScore: number;
  readonly timestamp: number;
}
