/**
 * Phase 10.3 — Explainability Panel UX types (read-only, deterministic)
 */

import type { Explanation, ExplanationSection } from '../explanation/explanation.types';
import type { DecisionTrace } from '../trace/decision-trace.types';

/** Closed enum for section types displayed in the panel */
export const EXPLANATION_SECTION_TYPES = [
  'WHAT',
  'WHY',
  'WHY_NOT',
  'MODE',
  'SAFETY',
  'OUTCOME',
] as const;

export type ExplanationSectionTypeLabel = (typeof EXPLANATION_SECTION_TYPES)[number];

export interface ExplainabilityPanelProps {
  readonly explanation: Explanation;
  /** Optional: for timeline step references only. Not used for any decision logic. */
  readonly trace?: DecisionTrace;
}

export interface ExplanationSectionViewProps {
  readonly section: ExplanationSection;
  readonly showSourceSteps: boolean;
}

export interface ExplanationTimelineProps {
  /** Step indices to display in order (from section.sourceSteps). Read-only. */
  readonly sourceSteps: readonly number[];
}

export type { Explanation, ExplanationSection, DecisionTrace };
