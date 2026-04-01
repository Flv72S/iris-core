/**
 * IRIS Product Demo — Proiezione di stato, read-only, deterministica.
 * Nessuna logica di business, nessun side-effect.
 */

import React, { useMemo, useState } from 'react';
import { AppLayout } from './ui/layout/AppLayout';
import { UxStatePanel } from './ui/panels/UxStatePanel';
import { ExperiencePanel } from './ui/panels/ExperiencePanel';
import { FeaturePanel } from './ui/panels/FeaturePanel';
import { allScenarios } from './scenarios';
import { runDemo } from './mockEngine';
import type { ProductMode } from '../product/orchestration/ProductMode';

export function App(): React.ReactElement {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    allScenarios[0].id
  );
  const [selectedMode, setSelectedMode] = useState<ProductMode>('DEFAULT');

  const scenario = useMemo(
    () => allScenarios.find((s) => s.id === selectedScenarioId) ?? allScenarios[0],
    [selectedScenarioId]
  );

  const output = useMemo(
    () => runDemo(scenario, selectedMode),
    [scenario, selectedMode]
  );

  return (
    <AppLayout
      scenarios={allScenarios}
      selectedScenarioId={selectedScenarioId}
      onScenarioChange={setSelectedScenarioId}
      selectedMode={selectedMode}
      onModeChange={setSelectedMode}
    >
      <UxStatePanel uxState={output.uxState} />
      <ExperiencePanel experience={output.experience} isCentralColumn />
      <FeaturePanel
        features={output.features}
        isOverloaded={output.experience.label === 'OVERLOADED'}
      />
    </AppLayout>
  );
}

// IRIS Demo — Consolidated Baseline
// This UI consumes the UX Contract as-is.
// No interpretation or behavior lives here.
