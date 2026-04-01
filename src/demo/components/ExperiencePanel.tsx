/**
 * ExperiencePanel — Mostra label, confidenceBand, suggestedLens, explanation.
 */

import React from 'react';
import type { UxExperienceState } from '../../product/ux-experience/UxExperienceState';

interface ExperiencePanelProps {
  experience: UxExperienceState;
}

export function ExperiencePanel({ experience }: ExperiencePanelProps): React.ReactElement {
  return (
    <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ccc' }}>
      <h3 style={{ marginTop: 0 }}>Experience</h3>
      <p style={{ margin: '4px 0' }}>
        <strong>Label</strong> {experience.label}
      </p>
      <p style={{ margin: '4px 0' }}>
        <strong>Confidence</strong> {experience.confidenceBand}
      </p>
      <p style={{ margin: '4px 0' }}>
        <strong>Lens</strong> {experience.suggestedLens}
      </p>
      <p
        style={{
          margin: '12px 0 0',
          padding: 12,
          background: '#f5f5f5',
          fontWeight: 500,
        }}
      >
        {experience.explanation}
      </p>
    </section>
  );
}
