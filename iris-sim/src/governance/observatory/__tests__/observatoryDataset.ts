/**
 * Step 7E — Longitudinal test data. Simulated 365 days of governance snapshots.
 */

import type { GovernanceSnapshot } from '../GovernanceSnapshot.js';

const TIERS = ['TIER_0_LOCKED', 'TIER_1_RESTRICTED', 'TIER_2_CONTROLLED', 'TIER_3_STABLE', 'TIER_4_ENTERPRISE_READY'];
const SLAS = ['COMMUNITY', 'PROFESSIONAL', 'ENTERPRISE', 'SOVEREIGN'];

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/**
 * Generate deterministic daily snapshots for 365 days.
 * Seed for reproducibility.
 */
export function generateObservatoryDataset(
  startTimestamp: number,
  seed: number = 42
): GovernanceSnapshot[] {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const snapshots: GovernanceSnapshot[] = [];
  let s = seed;

  for (let day = 0; day < 365; day++) {
    s = (s * 1103515245 + 12345) & 0x7fff_ffff;
    const r1 = (s % 1000) / 1000;
    s = (s * 1103515245 + 12345) & 0x7fff_ffff;
    const r2 = (s % 1000) / 1000;
    s = (s * 1103515245 + 12345) & 0x7fff_ffff;
    const r3 = (s % 1000) / 1000;

    const ts = startTimestamp + day * oneDayMs;
    const tierIdx = Math.min(4, Math.floor(r1 * 5));
    const tierDistribution: Record<string, number> = {};
    for (let i = 0; i < TIERS.length; i++) {
      tierDistribution[TIERS[i]!] = i === tierIdx ? 0.6 + r2 * 0.3 : (1 - 0.6 - r2 * 0.3) / 4;
    }
    const slaDistribution: Record<string, number> = {};
    for (let i = 0; i < SLAS.length; i++) {
      slaDistribution[SLAS[i]!] = 0.25 + (r3 - 0.5) * 0.1;
    }
    const decisionLoad = clamp01(0.3 + (day / 365) * 0.4 + r1 * 0.2);
    const overrideRate = clamp01(0.05 + (day / 365) * 0.1 + r2 * 0.1);
    const consensusRate = clamp01(0.7 - (day / 365) * 0.2 + r3 * 0.15);
    const governanceEntropy = clamp01(0.3 + r1 * 0.5);
    const stabilityIndex = clamp01(0.6 + (day / 365) * 0.2 - r2 * 0.2);
    const systemStress = clamp01(0.2 + (day / 365) * 0.2 + r3 * 0.2);

    snapshots.push(
      Object.freeze({
        timestamp: ts,
        tierDistribution: Object.freeze(tierDistribution),
        slaDistribution: Object.freeze(slaDistribution),
        decisionLoad,
        overrideRate,
        consensusRate,
        governanceEntropy,
        stabilityIndex,
        systemStress,
      })
    );
  }

  return snapshots;
}
