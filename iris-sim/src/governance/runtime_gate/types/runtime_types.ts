/**
 * Step 8D — Governance Runtime Gate. Runtime request and decision types.
 */

export interface RuntimeActionRequest {
  readonly action: string;
  readonly requestedFeatures?: readonly string[];
}

export interface RuntimeDecision {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly autonomyLevel: string;
  readonly allowedFeatures: readonly string[];
  readonly auditMultiplier: number;
  readonly safetyConstraintLevel: number;
}
