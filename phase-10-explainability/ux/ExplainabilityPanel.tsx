/**
 * Phase 10.3 — Explainability Panel (read-only, deterministic, no logic)
 */

import React from 'react';
import type { ExplainabilityPanelProps } from './ExplainabilityPanel.types';
import { ExplanationSectionView } from './ExplanationSectionView';
import { ExplanationTimeline } from './ExplanationTimeline';

const SECTION_ORDER = ['WHAT', 'WHY', 'WHY_NOT', 'MODE', 'SAFETY', 'OUTCOME'] as const;

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  explanation,
  trace,
}) => {
  const orderedSections = SECTION_ORDER
    .map((type) => explanation.sections.find((s) => s.sectionType === type))
    .filter((s): s is NonNullable<typeof s> => s != null);

  const allSourceSteps = orderedSections.flatMap((s) => [...s.sourceSteps]);
  const uniqueSteps = Array.from(new Set(allSourceSteps)).sort((a, b) => a - b);

  return (
    <div data-testid="explainability-panel" role="region" aria-label="Explainability">
      <header data-testid="panel-header">
        <div data-testid="explanation-id">Explanation ID: {explanation.explanationId}</div>
        <div data-testid="trace-id">Trace ID: {explanation.traceId}</div>
      </header>
      <div data-testid="panel-body">
        {orderedSections.map((section) => (
          <ExplanationSectionView
            key={section.sectionType}
            section={section}
            showSourceSteps={true}
          />
        ))}
        <div data-testid="timeline-container">
          <ExplanationTimeline sourceSteps={uniqueSteps} />
        </div>
      </div>
      <footer data-testid="panel-footer">
        <div data-testid="explanation-hash">Explanation Hash: {explanation.explanationHash}</div>
      </footer>
    </div>
  );
};
