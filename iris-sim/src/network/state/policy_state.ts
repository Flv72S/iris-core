/**
 * Phase 14A — State Model Definition. Policy state (cross-network trust policies).
 */

export interface PolicyState {
  readonly policy_id: string;
  readonly source_domain: string;
  readonly target_domain: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}
