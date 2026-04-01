/**
 * ScenarioSelector — Select dropdown, cambia scenario demo. Read-only UI.
 */

import React from 'react';
import type { DemoScenario } from '../scenarios';

interface ScenarioSelectorProps {
  scenarios: readonly DemoScenario[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ScenarioSelector({
  scenarios,
  selectedId,
  onSelect,
}: ScenarioSelectorProps): React.ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <label htmlFor="scenario-select" style={{ marginRight: 8 }}>
        Scenario
      </label>
      <select
        id="scenario-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        style={{ padding: 4, minWidth: 180 }}
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
