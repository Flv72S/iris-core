/**
 * Stability Step 5C — Regime dynamics analyzer.
 * Orchestrates transition tracker and convergence detector; produces DynamicsReport. O(1) observe, O(N) report.
 */

import type { RegimeSnapshot, DynamicsReport, MonitoringConfig } from './dynamicsTypes.js';
import { DefaultMonitoringConfig } from './dynamicsTypes.js';
import { TransitionTracker } from './transitionTracker.js';
import { ConvergenceDetector } from './convergenceDetector.js';
import { detectShock, detectMetaStability } from './robustMetrics.js';

const DEFAULT_WINDOW_SIZE = 100;

export class RegimeDynamicsAnalyzer {
  private readonly _history: RegimeSnapshot[] = [];
  private readonly _windowSize: number;
  private readonly _config: MonitoringConfig;
  private readonly _transitionTracker = new TransitionTracker();
  private readonly _convergenceDetector: ConvergenceDetector;

  constructor(config?: Partial<MonitoringConfig>, windowSize: number = DEFAULT_WINDOW_SIZE) {
    this._config = Object.freeze({ ...DefaultMonitoringConfig, ...config });
    this._windowSize = windowSize;
    this._convergenceDetector = new ConvergenceDetector(this._config);
  }

  observe(snapshot: RegimeSnapshot): void {
    this._transitionTracker.observe(snapshot);
    this._history.push(snapshot);
    if (this._history.length > this._windowSize) {
      this._history.shift();
    }
  }

  getDynamicsReport(): DynamicsReport {
    const residence = this._transitionTracker.getResidenceStats();
    const transitionFreq = this._transitionTracker.getTransitionFrequency();
    const conv = this._convergenceDetector.detectConvergence(this._history);
    const traj = this._convergenceDetector.computeTrajectory(this._history);

    const siValues = this._history.map((s) => s.stabilityIndex);
    const avgSI = siValues.length > 0 ? siValues.reduce((a, b) => a + b, 0) / siValues.length : 0;
    const shock = detectShock(siValues, 2.5);
    const metaStability = detectMetaStability(this._history, this._config.oscillationEpsilon);

    const a = 0.6;
    const b = 0.25;
    const c = 0.15;
    const inner =
      a * Math.max(0, 1 - avgSI) ** 2 +
      b * traj.oscillationAmplitude ** 2 +
      c * Math.min(10, transitionFreq) ** 2;
    const residualInstabilityScore = Math.max(
      0,
      Math.min(1, 1 - Math.exp(-inner))
    );
    const trajectoryStabilityScore = Math.max(0, Math.min(1, 1 - traj.oscillationAmplitude));

    return Object.freeze({
      convergenceStatus: conv.status,
      convergenceConfidence: conv.confidence,
      residualInstabilityScore,
      trajectoryStabilityScore,
      transitionFrequency: transitionFreq,
      envelopeResidence: residence,
      metaStability,
      plateauStrength: conv.plateauStrength,
      shockDetected: shock.hasShock,
      shockCount: shock.shockCount,
    });
  }
}
