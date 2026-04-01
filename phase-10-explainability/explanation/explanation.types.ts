/**
 * Phase 10.2 — Explanation output (readonly, deterministic)
 */

export type ExplanationSectionType =
  | 'WHAT'
  | 'WHY'
  | 'WHY_NOT'
  | 'MODE'
  | 'SAFETY'
  | 'OUTCOME';

export interface ExplanationSection {
  readonly sectionType: ExplanationSectionType;
  readonly content: string;
  readonly sourceSteps: readonly number[];
}

export interface Explanation {
  readonly explanationId: string;
  readonly traceId: string;
  readonly summary: string;
  readonly sections: readonly ExplanationSection[];
  readonly explanationHash: string;
}
