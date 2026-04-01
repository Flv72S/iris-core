/**
 * Phase 14A — State Model Definition. Trust state (normalized trust values).
 */

export interface TrustState {
  readonly node_id: string;
  readonly trust_score: number;
  readonly reputation_score: number;
}

export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 1;

export function isTrustScoreInRange(score: number): boolean {
  return typeof score === 'number' && Number.isFinite(score) && score >= TRUST_SCORE_MIN && score <= TRUST_SCORE_MAX;
}
