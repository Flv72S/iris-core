/**
 * Step 6F — Governance stress certification harness. Pure, deterministic, no side effects.
 */

import type { GovernanceSignal } from '../governanceTypes.js';
import type { GovernanceSignalSnapshot } from '../governanceSignalStabilityTypes.js';
import { GovernanceSignalStabilityMonitor } from '../governanceSignalStabilityMonitor.js';
import { HardeningInvariantEngine } from '../hardening/hardeningInvariantEngine.js';
import { generateStressScenario } from './stressScenarioGenerator.js';
import type { StressSimulationConfig, StressSimulationResult } from './stressSimulationTypes.js';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/**
 * Lightweight deterministic hash from scenario + key metrics. No crypto libs.
 */
function deterministicHash(
  scenario: StressSimulationResult['scenario'],
  globalHardeningIndex: number,
  flipRate: number,
  entropy: number
): string {
  const payload = JSON.stringify({
    scenario,
    g: Math.round(globalHardeningIndex * 1e6) / 1e6,
    f: Math.round(flipRate * 1e6) / 1e6,
    e: Math.round(entropy * 1e6) / 1e6,
  });
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  }
  const folded = (h >>> 0).toString(16);
  return `${scenario}:${folded}`;
}

function signalsToSnapshots(signals: readonly GovernanceSignal[]): GovernanceSignalSnapshot[] {
  return signals.map((s) => ({
    mode: s.mode,
    budgetMultiplier: s.budgetMultiplier,
    commitRateMultiplier: s.commitRateMultiplier,
    adaptationDampening: s.adaptationDampening,
    confidence: s.confidence,
  }));
}

export class GovernanceStressHarness {
  private readonly _hardeningEngine: HardeningInvariantEngine;

  constructor(
    hardeningEngine?: HardeningInvariantEngine,
    _stabilityMonitor?: GovernanceSignalStabilityMonitor
  ) {
    this._hardeningEngine = hardeningEngine ?? new HardeningInvariantEngine();
    void _stabilityMonitor;
  }

  /**
   * Run one stress simulation and return certification result. O(n), deterministic.
   * Uses a fresh stability monitor per run so the report depends only on this scenario.
   */
  runSimulation(config: StressSimulationConfig): StressSimulationResult {
    const { scenario, steps: configSteps } = config;
    const steps = Math.max(2, configSteps ?? 100);

    const { dynamicsHistory, governanceSignalHistory } = generateStressScenario({
      ...config,
      steps,
    });

    const monitor = new GovernanceSignalStabilityMonitor();
    let lastStabilityReport = monitor.observe(governanceSignalHistory[0]!);
    for (let i = 1; i < governanceSignalHistory.length; i++) {
      lastStabilityReport = monitor.observe(governanceSignalHistory[i]!);
    }
    const stabilityReport = lastStabilityReport;

    const snapshots = signalsToSnapshots(governanceSignalHistory);
    const hardeningReport = this._hardeningEngine.verifyDynamicsInvariants(
      dynamicsHistory,
      snapshots
    );

    const certificationScore = clamp01(
      0.6 * hardeningReport.globalHardeningIndex + 0.4 * (stabilityReport.stable ? 1 : 0)
    );
    const certificationPassed =
      hardeningReport.systemSafe &&
      stabilityReport.stable &&
      certificationScore >= 0.8;

    const deterministicHashStr = deterministicHash(
      scenario,
      hardeningReport.globalHardeningIndex,
      stabilityReport.flipRate,
      stabilityReport.entropy
    );

    return Object.freeze({
      scenario,
      steps,
      hardeningReport,
      stabilityReport,
      certificationPassed,
      certificationScore,
      deterministicHash: deterministicHashStr,
    });
  }
}
