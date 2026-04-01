/**
 * Step 6B — Governance signal stability monitor.
 * Observes sequence of GovernanceSignal; produces GovernanceStabilityReport. O(1) insert, O(windowSize) compute.
 */

import type { GovernanceSignal } from './governanceTypes.js';
import type {
  GovernanceSignalSnapshot,
  GovernanceStabilityReport,
  GovernanceStabilityThresholds,
} from './governanceSignalStabilityTypes.js';
import { DefaultGovernanceStabilityThresholds } from './governanceSignalStabilityTypes.js';

const BUDGET_RANGE = 0.7;
const COMMIT_RANGE = 0.7;
const DAMP_RANGE = 1;
const NUM_MODES = 4;
const MAX_ENTROPY = Math.log2(NUM_MODES);

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function shannonEntropy(counts: Map<string, number>, total: number): number {
  if (total <= 0) return 0;
  let h = 0;
  for (const c of counts.values()) {
    if (c > 0) {
      const p = c / total;
      h -= p * Math.log2(p);
    }
  }
  return h;
}

const NEUTRAL_REPORT: GovernanceStabilityReport = Object.freeze({
  flipCount: 0,
  flipRate: 0,
  modePersistence: 1,
  multiplierVolatility: 0,
  entropy: 0,
  stable: true,
});

export class GovernanceSignalStabilityMonitor {
  private readonly _windowSize: number;
  private readonly _thresholds: GovernanceStabilityThresholds;
  private readonly _buffer: GovernanceSignalSnapshot[] = [];

  constructor(
    windowSize: number = 50,
    thresholds?: Partial<GovernanceStabilityThresholds>
  ) {
    this._windowSize = Math.max(2, windowSize);
    this._thresholds = Object.freeze({
      ...DefaultGovernanceStabilityThresholds,
      ...thresholds,
    });
  }

  observe(signal: GovernanceSignal): GovernanceStabilityReport {
    const snapshot: GovernanceSignalSnapshot = {
      mode: signal.mode,
      budgetMultiplier: signal.budgetMultiplier,
      commitRateMultiplier: signal.commitRateMultiplier,
      adaptationDampening: signal.adaptationDampening,
      confidence: signal.confidence,
    };
    this._buffer.push(snapshot);
    if (this._buffer.length > this._windowSize) {
      this._buffer.shift();
    }
    if (this._buffer.length < 2) {
      return NEUTRAL_REPORT;
    }

    const n = this._buffer.length;
    let flipCount = 0;
    for (let i = 1; i < n; i++) {
      if (this._buffer[i].mode !== this._buffer[i - 1].mode) flipCount++;
    }
    const flipRate = flipCount / (n - 1);

    const runs: number[] = [];
    let runLen = 1;
    for (let i = 1; i < n; i++) {
      if (this._buffer[i].mode === this._buffer[i - 1].mode) runLen++;
      else {
        runs.push(runLen);
        runLen = 1;
      }
    }
    runs.push(runLen);
    const modePersistence = runs.reduce((a, b) => a + b, 0) / runs.length;

    const budget = this._buffer.map((s) => s.budgetMultiplier);
    const commit = this._buffer.map((s) => s.commitRateMultiplier);
    const damp = this._buffer.map((s) => s.adaptationDampening);
    const volBudget = stdDev(budget) / BUDGET_RANGE;
    const volCommit = stdDev(commit) / COMMIT_RANGE;
    const volDamp = stdDev(damp) / DAMP_RANGE;
    const multiplierVolatility = Math.min(
      1,
      (volBudget + volCommit + volDamp) / 3
    );

    const modeCounts = new Map<string, number>();
    for (const s of this._buffer) {
      modeCounts.set(s.mode, (modeCounts.get(s.mode) ?? 0) + 1);
    }
    const entropyRaw = shannonEntropy(modeCounts, n);
    const entropy = MAX_ENTROPY > 0 ? Math.min(1, entropyRaw / MAX_ENTROPY) : 0;

    const t = this._thresholds;
    const stable =
      flipRate < t.maxFlipRate &&
      multiplierVolatility < t.maxVolatility &&
      entropy < t.maxEntropy;

    return Object.freeze({
      flipCount,
      flipRate,
      modePersistence,
      multiplierVolatility,
      entropy,
      stable,
    });
  }
}
