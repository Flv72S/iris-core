/**
 * ExperiencePanel — User Experience Summary. Label prominente, explanation in card.
 * NEUTRAL: badge grigio, copy calmo. OVERLOADED: copy di supporto. Solo presentazione.
 */

import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import type { UxExperienceState } from '../../../product/ux-experience/UxExperienceState';

interface ExperiencePanelProps {
  experience: UxExperienceState;
  isCentralColumn?: boolean;
}

export function ExperiencePanel({
  experience,
  isCentralColumn = true,
}: ExperiencePanelProps): React.ReactElement {
  const isNeutral = experience.label === 'NEUTRAL';
  const isOverloaded = experience.label === 'OVERLOADED';

  return (
    <Card
      title="User Experience Summary"
      className={isCentralColumn ? 'demo-experience-card' : undefined}
    >
      <div className="demo-experience-badge-wrap">
        {isNeutral ? (
          <Badge variant="neutral" size="large">
            No dominant experience detected.
          </Badge>
        ) : (
          <Badge variant="accent" size="large">
            {experience.label}
          </Badge>
        )}
      </div>
      <p className="demo-small" style={{ marginBottom: 4 }}>
        Confidence: {experience.confidenceBand}
      </p>
      <p className="demo-small" style={{ marginBottom: '0.75rem' }}>
        Lens: {experience.suggestedLens}
      </p>
      {isOverloaded && (
        <p className="demo-small demo-overloaded-support">
          Multiple signals detected. Information is shown without prioritization.
        </p>
      )}
      <p className="demo-explanation-prefix">Current experience:</p>
      <div className="demo-explanation-block">
        {experience.explanation}
      </div>
    </Card>
  );
}
