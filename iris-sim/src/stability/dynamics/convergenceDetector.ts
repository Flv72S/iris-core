/**
 * Stability Step 5C — Convergence detector.
 * Gradient, acceleration, oscillation amplitude, convergence velocity; convergence status.
 */

import type {
  RegimeSnapshot,
  TrajectoryMetrics,
  ConvergenceResult,
  MonitoringConfig,
  PlateauStrength,
} from './dynamicsTypes.js';
import { robustStdDev } from './robustMetrics.js';

export class ConvergenceDetector {
  constructor(private readonly config: MonitoringConfig) {}

  computeTrajectory(history: RegimeSnapshot[]): TrajectoryMetrics {
    if (history.length < 2) {
      return Object.freeze({
        gradient: 0,
        acceleration: 0,
        oscillationAmplitude: 0,
        convergenceVelocity: 0,
      });
    }
    const si = history.map((s) => s.stabilityIndex);
    const ts = history.map((s) => s.timestamp);

    const gradient = this._gradient(si, ts);
    const acceleration = this._acceleration(si, ts);
    const oscillationAmplitude = this._oscillationAmplitude(si);
    const convergenceVelocity = gradient;

    return Object.freeze({
      gradient,
      acceleration,
      oscillationAmplitude,
      convergenceVelocity,
    });
  }

  detectConvergence(history: RegimeSnapshot[]): ConvergenceResult {
    if (history.length < this.config.stabilityHorizon) {
      return Object.freeze({
        status: 'TRANSIENT',
        confidence: 0,
        plateauStrength: 'FRAGILE',
      });
    }
    const window = history.slice(-this.config.stabilityHorizon);
    const trajWindow = this.computeTrajectory(window);
    const trajFull = this.computeTrajectory(history);
    const siWindow = window.map((s) => s.stabilityIndex);
    const robustOsc = robustStdDev(siWindow);
    const oscillationOk = robustOsc < this.config.oscillationEpsilon;
    const envelopeStable = this._noEnvelopeTransitionIn(window);
    const gradientOk = Math.abs(trajWindow.gradient) < this.config.gradientEpsilon;
    const velocityOk = trajWindow.convergenceVelocity >= 0;

    const avgSI = siWindow.reduce((a, b) => a + b, 0) / siWindow.length;
    const plateauStrength: PlateauStrength =
      avgSI >= 0.85 ? 'STRONG' : avgSI >= 0.6 ? 'WEAK' : 'FRAGILE';

    const plateauOk = plateauStrength !== 'FRAGILE';
    const converged =
      gradientOk && oscillationOk && envelopeStable && velocityOk && plateauOk;
    let pseudoReason: string | undefined;
    if (!plateauOk && gradientOk && oscillationOk) {
      pseudoReason = 'FRAGILE_PLATEAU';
    }
    const status: ConvergenceResult['status'] = converged
      ? 'CONVERGED'
      : envelopeStable && (gradientOk || oscillationOk) && plateauOk
        ? 'TRANSIENT'
        : 'NON_CONVERGENT';

    const confidence = this._confidence(
      history,
      trajFull,
      envelopeStable,
      gradientOk,
      oscillationOk,
      plateauOk
    );

    return Object.freeze({
      status,
      confidence,
      plateauStrength,
      ...(pseudoReason ? { pseudoConvergenceReason: pseudoReason } : {}),
    });
  }

  private _gradient(si: number[], ts: number[]): number {
    const n = si.length;
    if (n < 2) return 0;
    const dt = (ts[n - 1] - ts[0]) / 1000;
    if (dt <= 0) return 0;
    return (si[n - 1] - si[0]) / dt;
  }

  private _acceleration(si: number[], ts: number[]): number {
    const n = si.length;
    if (n < 3) return 0;
    const mid = Math.floor(n / 2);
    const dt1 = (ts[mid] - ts[0]) / 1000;
    const dt2 = (ts[n - 1] - ts[mid]) / 1000;
    if (dt1 <= 0 || dt2 <= 0) return 0;
    const v1 = (si[mid] - si[0]) / dt1;
    const v2 = (si[n - 1] - si[mid]) / dt2;
    return (v2 - v1) / ((dt1 + dt2) / 2);
  }

  private _oscillationAmplitude(si: number[]): number {
    if (si.length < 2) return 0;
    return robustStdDev(si);
  }

  private _noEnvelopeTransitionIn(window: RegimeSnapshot[]): boolean {
    if (window.length < 2) return true;
    const first = window[0].envelopeState;
    for (let i = 1; i < window.length; i++) {
      if (window[i].envelopeState !== first) return false;
    }
    return true;
  }

  private _confidence(
    history: RegimeSnapshot[],
    _traj: TrajectoryMetrics,
    envelopeStable: boolean,
    gradientOk: boolean,
    oscillationOk: boolean,
    plateauOk: boolean
  ): number {
    let c = 0;
    if (gradientOk) c += 0.3;
    if (oscillationOk) c += 0.3;
    if (envelopeStable) c += 0.2;
    if (plateauOk) c += 0.1;
    const horizonFactor = Math.min(1, history.length / (this.config.stabilityHorizon * 2));
    c += 0.1 * horizonFactor;
    return Math.max(0, Math.min(1, c));
  }
}
