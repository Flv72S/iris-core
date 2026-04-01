/**
 * AppLayout — Header + ControlBar + 3 colonne (UX State | Experience | Features).
 */

import React from 'react';
import { Header } from './Header';
import { ControlBar } from './ControlBar';
import type { DemoScenario } from '../../scenarios';
import type { ProductMode } from '../../../product/orchestration/ProductMode';

interface AppLayoutProps {
  scenarios: readonly DemoScenario[];
  selectedScenarioId: string;
  onScenarioChange: (id: string) => void;
  selectedMode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
}

export function AppLayout({
  scenarios,
  selectedScenarioId,
  onScenarioChange,
  selectedMode,
  onModeChange,
  children,
}: AppLayoutProps): React.ReactElement {
  return (
    <div className="demo-root">
      <div className="demo-layout">
        <Header />
        <ControlBar
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          onScenarioChange={onScenarioChange}
          selectedMode={selectedMode}
          onModeChange={onModeChange}
        />
        <div className="demo-columns">
          <div className="demo-column">{children[0]}</div>
          <div className="demo-column">{children[1]}</div>
          <div className="demo-column">{children[2]}</div>
        </div>
      </div>
    </div>
  );
}
