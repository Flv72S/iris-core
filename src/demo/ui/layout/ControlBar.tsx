/**
 * ControlBar — Scenario dropdown + Product Mode segmented control.
 * Cambiano solo input mock, non stato reale.
 */

import React from 'react';
import type { DemoScenario } from '../../scenarios';
import type { ProductMode } from '../../../product/orchestration/ProductMode';

interface ControlBarProps {
  scenarios: readonly DemoScenario[];
  selectedScenarioId: string;
  onScenarioChange: (id: string) => void;
  selectedMode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
}

const MODES: ProductMode[] = ['DEFAULT', 'FOCUS', 'WELLBEING'];

export function ControlBar({
  scenarios,
  selectedScenarioId,
  onScenarioChange,
  selectedMode,
  onModeChange,
}: ControlBarProps): React.ReactElement {
  return (
    <div className="demo-control-bar demo-card">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
        <div>
          <label htmlFor="demo-scenario" className="demo-small" style={{ display: 'block', marginBottom: 4 }}>
            Scenario
          </label>
          <select
            id="demo-scenario"
            value={selectedScenarioId}
            onChange={(e) => onScenarioChange(e.target.value)}
            style={{
              padding: '6px 10px',
              minWidth: 180,
              border: '1px solid var(--demo-border)',
              borderRadius: 4,
              background: 'var(--demo-card-bg)',
              color: 'var(--demo-text-primary)',
              fontSize: 14,
            }}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="demo-small" style={{ display: 'block', marginBottom: 4 }}>
            Product Mode
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onModeChange(mode)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--demo-border)',
                  borderRadius: 4,
                  background: selectedMode === mode ? 'var(--demo-accent)' : 'var(--demo-card-bg)',
                  color: selectedMode === mode ? '#fff' : 'var(--demo-text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
