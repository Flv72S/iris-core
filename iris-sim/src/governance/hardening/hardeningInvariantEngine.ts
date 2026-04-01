/**
 * Step 6E — Hardening invariant engine.
 * Verifies formal invariants on dynamics and governance history. O(windowSize) for audit, no mutation.
 */

import { robustStdDev } from '../../stability/dynamics/robustMetrics.js';
import type { GovernanceSignalSnapshot } from '../governanceSignalStabilityTypes.js';
import type {
  DynamicsSnapshot,
  FormalInvariantResult,
  HardeningAuditReport,
  HardeningInvariantConfig,
} from './invariantTypes.js';
import { DefaultHardeningInvariantConfig } from './invariantTypes.js';

const PLATEAU_NUM: Record<string, number> = { STRONG: 1, WEAK: 0.6, FRAGILE: 0.2 };

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function entropy(counts: Map<string, number>, total: number): number {
  if (total <= 0) return 0;
  let h = 0;
  for (const c of counts.values()) {
    if (c > 0) h -= (c / total) * Math.log2(c / total);
  }
  return h;
}

function slope(values: number[], ts: number[]): number {
  if (values.length < 2 || ts.length < 2) return 0;
  const n = values.length;
  const dt = (ts[n - 1] - ts[0]) / 1000;
  if (dt <= 0) return 0;
  return (values[n - 1] - values[0]) / dt;
}

export class HardeningInvariantEngine {
  private readonly _config: HardeningInvariantConfig;

  constructor(config?: Partial<HardeningInvariantConfig>) {
    this._config = Object.freeze({
      ...DefaultHardeningInvariantConfig,
      ...config,
    });
  }

  verifyDynamicsInvariants(
    dynamicsHistory: readonly DynamicsSnapshot[],
    governanceSignalHistory: readonly GovernanceSignalSnapshot[]
  ): HardeningAuditReport {
    const now = Date.now();
    const cap = this._config.windowSize;
    const dyn = dynamicsHistory.slice(-cap);
    const gov = governanceSignalHistory.slice(-cap);
    const n = Math.min(dyn.length, gov.length);
    if (n < 2) {
      return Object.freeze({
        timestamp: now,
        regimeConsistencyScore: 1,
        hysteresisPersistenceScore: 1,
        monotonicityScore: 1,
        invariantResults: [],
        globalHardeningIndex: 1,
        systemSafe: true,
      });
    }

    const plateauNum = dyn.map((d) => PLATEAU_NUM[d.plateauStrength] ?? 0.2);
    const plateauStd = robustStdDev(plateauNum);
    const envelopeCounts = new Map<string, number>();
    for (const d of dyn) {
      envelopeCounts.set(d.envelopeState, (envelopeCounts.get(d.envelopeState) ?? 0) + 1);
    }
    const maxEntropy = Math.log2(3); // SAFE | STRESS | CRITICAL
    const entropyEnvelope = maxEntropy > 0 ? entropy(envelopeCounts, n) / maxEntropy : 0;
    const residualTrend = slope(
      dyn.map((d) => d.residualInstabilityScore),
      dyn.map((d) => d.timestamp)
    );
    const regimeConsistencyScore = clamp01(
      1 - (0.5 * plateauStd + 0.3 * entropyEnvelope + 0.2 * Math.abs(residualTrend))
    );

    let flipCount = 0;
    for (let i = 1; i < gov.length; i++) {
      if (gov[i].mode !== gov[i - 1].mode) flipCount++;
    }
    const flipRate = gov.length > 1 ? flipCount / (gov.length - 1) : 0;
    const runs: number[] = [];
    let runLen = 1;
    for (let i = 1; i < gov.length; i++) {
      if (gov[i].mode === gov[i - 1].mode) runLen++;
      else {
        runs.push(runLen);
        runLen = 1;
      }
    }
    runs.push(runLen);
    const modePersistenceMean = runs.length > 0 ? runs.reduce((a, b) => a + b, 0) / runs.length : 0;
    const hysteresisOk = flipRate < 0.1 && modePersistenceMean >= 3;
    const hysteresisPersistenceScore = hysteresisOk
      ? 1
      : clamp01(1 - (flipRate / 0.1) * 0.5 - (modePersistenceMean < 3 ? 0.3 : 0));

    let monotonicityViolationLen = 0;
    let maxViolationLen = 0;
    for (let i = 2; i < n; i++) {
      const mode = gov[i].mode;
      if (mode !== 'RECOVERY' && mode !== 'NORMAL') {
        monotonicityViolationLen = 0;
        continue;
      }
      const r0 = dyn[i - 2]?.residualInstabilityScore ?? 0;
      const r1 = dyn[i - 1]?.residualInstabilityScore ?? 0;
      const r2 = dyn[i]?.residualInstabilityScore ?? 0;
      const acc = r2 - 2 * r1 + r0;
      if (acc > this._config.epsilon) {
        monotonicityViolationLen++;
        maxViolationLen = Math.max(maxViolationLen, monotonicityViolationLen);
      } else {
        monotonicityViolationLen = 0;
      }
    }
    const monotonicityViolated = maxViolationLen > 3;
    const monotonicityScore = monotonicityViolated
      ? clamp01(1 - 0.2 * Math.min(maxViolationLen, 10))
      : 1;

    const inv1: FormalInvariantResult = Object.freeze({
      invariantName: 'REGIME_CONSISTENCY',
      violated: regimeConsistencyScore < this._config.hardeningThreshold,
      severityScore: 1 - regimeConsistencyScore,
      confidence: regimeConsistencyScore,
    });
    const inv2: FormalInvariantResult = Object.freeze({
      invariantName: 'HYSTERESIS_PERSISTENCE',
      violated: !hysteresisOk,
      severityScore: hysteresisOk ? 0 : clamp01(flipRate / 0.1 + (3 - modePersistenceMean) / 3),
      confidence: hysteresisOk ? 1 : 1 - flipRate,
    });
    const inv3: FormalInvariantResult = Object.freeze(
      monotonicityViolated
        ? {
            invariantName: 'MONOTONICITY_UNDER_RECOVERY',
            violated: true,
            severityScore: clamp01(0.1 * maxViolationLen),
            confidence: 1 - 0.2 * Math.min(maxViolationLen, 5),
            diagnosticMessage: `Positive acceleration for ${maxViolationLen} steps`,
          }
        : {
            invariantName: 'MONOTONICITY_UNDER_RECOVERY',
            violated: false,
            severityScore: 0,
            confidence: 1,
          }
    );

    const invariantResults: readonly FormalInvariantResult[] = [inv1, inv2, inv3];
    const globalHardeningIndex = clamp01(
      0.4 * regimeConsistencyScore + 0.35 * hysteresisPersistenceScore + 0.25 * monotonicityScore
    );
    const systemSafe =
      globalHardeningIndex >= this._config.hardeningThreshold &&
      invariantResults.every((r) => !r.violated);

    return Object.freeze({
      timestamp: now,
      regimeConsistencyScore,
      hysteresisPersistenceScore,
      monotonicityScore,
      invariantResults,
      globalHardeningIndex,
      systemSafe,
    });
  }
}
