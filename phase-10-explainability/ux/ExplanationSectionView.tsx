/**
 * Phase 10.3 — Single explanation section (read-only, no rewriting)
 */

import React from 'react';
import type { ExplanationSectionViewProps } from './ExplainabilityPanel.types';
import type { ExplanationSectionType } from '../explanation/explanation.types';

const SECTION_TITLES: Record<ExplanationSectionType, string> = {
  WHAT: 'What happened',
  WHY: 'Why',
  WHY_NOT: 'Why not',
  MODE: 'Mode',
  SAFETY: 'Safety',
  OUTCOME: 'Outcome',
};

export const ExplanationSectionView: React.FC<ExplanationSectionViewProps> = ({
  section,
  showSourceSteps,
}) => {
  const title = SECTION_TITLES[section.sectionType];
  return (
    <section data-section-type={section.sectionType} data-testid={`section-${section.sectionType}`}>
      <h3>{title}</h3>
      <p>{section.content}</p>
      {showSourceSteps && section.sourceSteps.length > 0 && (
        <div data-testid={`source-steps-${section.sectionType}`}>
          <span>Step references: </span>
          <span>{section.sourceSteps.join(', ')}</span>
        </div>
      )}
    </section>
  );
};
