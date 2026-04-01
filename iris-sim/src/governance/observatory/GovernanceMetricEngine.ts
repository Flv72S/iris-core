/**
 * Step 7E — Governance Observatory. Metric engine (deterministic, read-only).
 */

import type { GovernanceSnapshot } from './GovernanceSnapshot.js';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

function entropyFromDistribution(dist: Record<string, number>): number {
  const values = Object.values(dist).filter((v) => v > 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const v of values) {
    const p = v / total;
    h -= p * Math.log2(p);
  }
  return clamp01(h / Math.log2(Math.max(2, values.length + 1)));
}

export class GovernanceMetricEngine {
  computeEntropy(snapshot: GovernanceSnapshot): number {
    return entropyFromDistribution(snapshot.tierDistribution);
  }

  computeDecisionVelocity(
    previous: GovernanceSnapshot,
    current: GovernanceSnapshot
  ): number {
    const dt = (current.timestamp - previous.timestamp) / 1000;
    if (dt <= 0) return 0;
    const delta = Math.abs(current.decisionLoad - previous.decisionLoad);
    return clamp01(delta / (1 + dt));
  }

  computeConsensusStability(snapshots: readonly GovernanceSnapshot[]): number {
    if (snapshots.length < 2) return 1;
    const rates = snapshots.map((s) => s.consensusRate);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance =
      rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length;
    const std = Math.sqrt(variance);
    return clamp01(1 - std);
  }

  computeTierMigrationRate(
    previous: GovernanceSnapshot,
    current: GovernanceSnapshot
  ): number {
    const keys = new Set([
      ...Object.keys(previous.tierDistribution),
      ...Object.keys(current.tierDistribution),
    ]);
    let delta = 0;
    for (const k of keys) {
      const p = previous.tierDistribution[k] ?? 0;
      const c = current.tierDistribution[k] ?? 0;
      delta += Math.abs(c - p);
    }
    return clamp01(delta / 2);
  }

  computeSLAPressure(snapshot: GovernanceSnapshot): number {
    const dist = snapshot.slaDistribution;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total <= 0) return 0;
    const entries = Object.entries(dist);
    const weighted = entries.reduce(
      (s, [, v]) => s + (v / total) * (1 - snapshot.stabilityIndex),
      0
    );
    return clamp01(weighted);
  }

  computeOverrideDrift(snapshots: readonly GovernanceSnapshot[]): number {
    if (snapshots.length < 2) return 0;
    const rates = snapshots.map((s) => s.overrideRate);
    const first = rates[0] ?? 0;
    const last = rates[rates.length - 1] ?? 0;
    return clamp01(Math.abs(last - first));
  }

  computeSystemStressIndex(snapshots: readonly GovernanceSnapshot[]): number {
    if (snapshots.length === 0) return 0;
    const avg =
      snapshots.reduce((a, s) => a + s.systemStress, 0) / snapshots.length;
    return clamp01(avg);
  }
}
