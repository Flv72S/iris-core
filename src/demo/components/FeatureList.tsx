/**
 * FeatureList — Mostra OrchestratedFeature: title, featureType, visibility, priority, explanation, appliedMode. Non cliccabili.
 */

import React from 'react';
import type { OrchestratedFeature } from '../../product/orchestration/OrchestratedFeature';

interface FeatureListProps {
  features: readonly OrchestratedFeature[];
}

export function FeatureList({ features }: FeatureListProps): React.ReactElement {
  return (
    <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ccc' }}>
      <h3 style={{ marginTop: 0 }}>Features</h3>
      {features.length === 0 ? (
        <p style={{ margin: 0, color: '#666' }}>No features</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {features.map((f) => (
            <li
              key={f.featureId}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid #eee',
                fontSize: 14,
              }}
            >
              <strong>{f.title}</strong>
              <span style={{ marginLeft: 8, color: '#666' }}>({f.featureType})</span>
              <p style={{ margin: '4px 0', fontSize: 12 }}>
                visibility: {f.visibility} · priority: {f.priority} · mode: {f.appliedMode}
              </p>
              <p style={{ margin: '4px 0', color: '#444' }}>{f.explanation}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
