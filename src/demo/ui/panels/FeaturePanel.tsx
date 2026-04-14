/**
 * FeaturePanel — Active Product Features. H3 per titolo feature, badge piccolo.
 * Empty: copy neutro. Non cliccabili, solo lettura.
 */

import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Divider } from '../components/Divider';
import type { OrchestratedFeature } from '../../../product/orchestration/OrchestratedFeature';

interface FeaturePanelProps {
  features: readonly OrchestratedFeature[];
  isOverloaded?: boolean;
}

export function FeaturePanel({
  features,
  isOverloaded = false,
}: FeaturePanelProps): React.ReactElement {
  const isEmpty = features.length === 0;

  return (
    <Card
      title="Active Product Features"
      className={isOverloaded ? 'demo-features-deemphasized' : undefined}
    >
      {isEmpty ? (
        <p className="demo-body">No active features for this scenario.</p>
      ) : (
        <ul className="demo-feature-list">
          {features.map((f, i) => (
            <li key={f.featureId} className="demo-feature-item">
              {i > 0 && <Divider />}
              <h3 className="demo-h3">{f.title}</h3>
              <span className="demo-feature-badge-wrap">
                <Badge variant="neutral" size="small">
                  {f.featureType}
                </Badge>
              </span>
              <p className="demo-small demo-feature-meta">
                visibility: {f.visibility} · priority: {f.priority} · mode:{' '}
                {f.appliedMode}
              </p>
              <p className="demo-small demo-feature-explanation">
                {f.explanation}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
