/**
 * UxStatePanel — System State (UX Projection). Lista stati, stile system log.
 * Empty state: copy neutro. Badge neutro + severity accent.
 */

import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import type { UxStateSnapshot } from '../../../../messaging-system/ux-state/UxStateSnapshot';

interface UxStatePanelProps {
  uxState: UxStateSnapshot;
}

function severityVariant(
  severity: string | undefined
): 'neutral' | 'accent' | 'warning' {
  if (severity === 'warning' || severity === 'attention') return 'warning';
  return 'neutral';
}

export function UxStatePanel({ uxState }: UxStatePanelProps): React.ReactElement {
  const isEmpty = uxState.states.length === 0;

  return (
    <Card title="System State (UX Projection)">
      {isEmpty ? (
        <>
          <p className="demo-body">No active system states.</p>
          <p className="demo-small" style={{ marginTop: '0.5rem' }}>
            The system is currently idle and stable.
          </p>
        </>
      ) : (
        <ul className="demo-state-list">
          {uxState.states.map((s) => (
            <li key={s.stateId} className="demo-state-item">
              <Badge variant={severityVariant(s.severity)} size="medium">
                {s.stateType}
              </Badge>
              {s.severity != null && (
                <span className="demo-state-severity">{s.severity}</span>
              )}
              <div className="demo-body demo-state-title">{s.title}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
