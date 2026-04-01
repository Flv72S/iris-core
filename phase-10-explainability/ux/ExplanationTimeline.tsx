/**
 * Phase 10.3 — Causal step sequence (read-only, no decision logic, no state mutation)
 */

import React from 'react';
import type { ExplanationTimelineProps } from './ExplainabilityPanel.types';

export const ExplanationTimeline: React.FC<ExplanationTimelineProps> = ({ sourceSteps }) => {
  return (
    <div data-testid="explanation-timeline" role="list" aria-label="Explanation step references">
      {sourceSteps.map((stepIndex, i) => (
        <div key={`${stepIndex}-${i}`} role="listitem" data-step-index={stepIndex}>
          Step {stepIndex}
        </div>
      ))}
    </div>
  );
};
