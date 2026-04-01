/**
 * SmartSummaryOutput — C.7
 * Output UX per Smart Summary.
 */

import type { ConfidenceBand } from '../../../../ux-experience/UxExperienceState';

export interface SmartSummaryOutput {
  readonly title: string;
  readonly highlights: readonly string[];
  readonly confidenceBand: ConfidenceBand;
  readonly derivedAt: number;
}
