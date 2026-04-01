/**
 * UxStatePanel — Mostra elenco UxState (stateType, title, severity). Layout tipo log.
 */

import React from 'react';
import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';

interface UxStatePanelProps {
  uxState: UxStateSnapshot;
}

export function UxStatePanel({ uxState }: UxStatePanelProps): React.ReactElement {
  return (
    <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ccc' }}>
      <h3 style={{ marginTop: 0 }}>UX State</h3>
      {uxState.states.length === 0 ? (
        <p style={{ margin: 0, color: '#666' }}>No states</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {uxState.states.map((s) => (
            <li
              key={s.stateId}
              style={{
                padding: '6px 0',
                borderBottom: '1px solid #eee',
                fontSize: 14,
              }}
            >
              <strong>{s.stateType}</strong>
              {s.severity != null && (
                <span style={{ marginLeft: 8, color: '#666' }}>({s.severity})</span>
              )}
              <div style={{ marginTop: 2 }}>{s.title}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
