/**
 * Phase 7 Final Verification — Integrity checks (read-only, deterministic).
 */

import { generateKeyPairSync } from 'node:crypto';
import type { GovernanceSnapshotForTiering } from '../tiering/hardCaps.js';
import type { GovernanceTier } from '../tiering/hysteresis.js';
import { generateTierSnapshot } from '../tiering/snapshot.js';
import { tierFromScore, computeTierWithHysteresis } from '../tiering/hysteresis.js';
import type { TierState } from '../tiering/hysteresis.js';
import { mapTierToSLA } from '../tiering/slaMapping.js';
import { generateGovernanceCertification } from '../certification/certification.js';
import { generateCommercialSnapshot } from '../commercial/capabilitySnapshot.js';
import { runGovernanceSimulation } from '../simulation/simulationEngine.js';
import { STRESS_SCENARIOS } from '../simulation/scenarios.js';
import { GovernanceObservatoryService } from '../observatory/GovernanceObservatoryService.js';
import type { VerificationScenario } from './verificationScenarios.js';

const DEFAULT_STATE: TierState = Object.freeze({
  currentTier: 'TIER_3_STABLE',
  lastUpgradeAt: null,
  lastDowngradeAt: null,
});

function getTestKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = Uint8Array.from(privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer);
  const spki = Uint8Array.from(pubObj.export({ type: 'spki', format: 'der' }) as Buffer);
  return { privateKey: pkcs8, publicKey: spki };
}

/**
 * Run tier 10 times → same score/tier; certify same snapshot 10 times → same hash.
 */
export function verifyDeterminism(scenario: VerificationScenario): boolean {
  const keys = getTestKeyPair();
  const state: TierState = { ...DEFAULT_STATE };
  let firstScore: number | undefined;
  let firstTier: GovernanceTier | undefined;

  for (let i = 0; i < 10; i++) {
    const tierSnap = generateTierSnapshot(scenario.snapshot, state);
    if (firstScore === undefined) {
      firstScore = tierSnap.score;
      firstTier = tierSnap.tier;
    } else {
      if (tierSnap.score !== firstScore) return false;
      if (tierSnap.tier !== firstTier) return false;
    }
  }

  const oneTierSnap = generateTierSnapshot(scenario.snapshot, state);
  let firstHash: string | undefined;
  for (let i = 0; i < 10; i++) {
    const cert = generateGovernanceCertification(oneTierSnap, keys.privateKey, keys.publicKey);
    if (firstHash === undefined) firstHash = cert.payloadHash;
    else if (cert.payloadHash !== firstHash) return false;
  }
  return true;
}

/**
 * Verify full pipeline: snapshot → tier → certification → SLA → commercial export; no data lost, tier coherent with score.
 */
export function verifyPipelineIntegrity(scenario: VerificationScenario): boolean {
  const state: TierState = { ...DEFAULT_STATE };
  const tierSnap = generateTierSnapshot(scenario.snapshot, state);
  if (!Number.isFinite(tierSnap.score) || tierSnap.score < 0 || tierSnap.score > 1) return false;
  const tierFromScoreVal = tierFromScore(tierSnap.score);
  if (tierSnap.tier !== tierFromScoreVal && !tierSnap.hardCapApplied && !tierSnap.structuralCapApplied) return false;
  const keys = getTestKeyPair();
  const cert = generateGovernanceCertification(tierSnap, keys.privateKey, keys.publicKey);
  if (cert.tier !== tierSnap.tier || cert.score !== tierSnap.score) return false;
  const sla = mapTierToSLA(tierSnap.tier);
  if (sla.tier !== tierSnap.tier) return false;
  const commercial = generateCommercialSnapshot(tierSnap, cert);
  if (commercial.tier !== tierSnap.tier) return false;
  return true;
}

/**
 * Verify that invariantViolationCount > 0 triggers hard cap and tier ≤ TIER_2.
 */
export function verifyHardCaps(): boolean {
  const scenario: VerificationScenario = {
    name: 'HardCapCheck',
    snapshot: {
      mode: 'NORMAL',
      budgetMultiplier: 0.9,
      commitRateMultiplier: 0.9,
      adaptationDampening: 0.2,
      confidence: 0.9,
      flipRate: 0,
      entropyIndex: 0,
      invariantViolationCount: 1,
      violationFrequency: 0,
    },
  };
  const state: TierState = { ...DEFAULT_STATE };
  const tierSnap = generateTierSnapshot(scenario.snapshot, state);
  if (!tierSnap.hardCapApplied) return false;
  const order: GovernanceTier[] = ['TIER_0_LOCKED', 'TIER_1_RESTRICTED', 'TIER_2_CONTROLLED', 'TIER_3_STABLE', 'TIER_4_ENTERPRISE_READY'];
  const tierIdx = order.indexOf(tierSnap.tier);
  const maxAllowed = order.indexOf('TIER_2_CONTROLLED');
  return tierIdx <= maxAllowed;
}

/**
 * Verify anti-gaming: metric floor or structural cap activates when metrics are skewed.
 */
export function verifyAntiGamingActivation(
  snapshot: GovernanceSnapshotForTiering
): boolean {
  const state: TierState = { ...DEFAULT_STATE };
  const tierSnap = generateTierSnapshot(snapshot, state);
  return tierSnap.structuralCapApplied || tierSnap.hardCapApplied;
}

/**
 * Oscillate score around threshold; tier should not flip every step (hysteresis margins).
 */
export function verifyHysteresisStability(): boolean {
  const scores = [0.74, 0.75, 0.74, 0.75, 0.74];
  let state: TierState = {
    currentTier: 'TIER_3_STABLE',
    lastUpgradeAt: null,
    lastDowngradeAt: null,
  };
  const tiers: GovernanceTier[] = [];
  for (const score of scores) {
    const t = computeTierWithHysteresis(score, state, null, null);
    tiers.push(t);
    state = { ...state, currentTier: t };
  }
  const allSame = tiers.every((t) => t === 'TIER_3_STABLE');
  return allSame;
}

/**
 * Run simulation (50 steps); no exception, scores in [0,1], valid tiers.
 */
export function verifySimulationEngine(): boolean {
  const scenario = STRESS_SCENARIOS[0];
  if (!scenario) return false;
  const baseSnap = {
    modelVersion: '7A_v1.0' as const,
    score: 0.8,
    tier: 'TIER_3_STABLE' as const,
    computedAt: 1000000,
    normalizedMetrics: Object.freeze({
      flipStability: 0.9,
      invariantIntegrity: 0.9,
      entropyControl: 0.9,
      violationPressure: 0.9,
    }),
    hardCapApplied: false,
    structuralCapApplied: false,
  };
  const result = runGovernanceSimulation(baseSnap, {
    ...scenario,
    totalSteps: 50,
  });
  if (result.steps !== 50) return false;
  const validTiers = ['TIER_0_LOCKED', 'TIER_1_RESTRICTED', 'TIER_2_CONTROLLED', 'TIER_3_STABLE', 'TIER_4_ENTERPRISE_READY'];
  for (let i = 0; i < result.scoreTimeline.length; i++) {
    const s = result.scoreTimeline[i]!;
    if (!Number.isFinite(s) || s < 0 || s > 1) return false;
    if (!validTiers.includes(result.tierTimeline[i]!)) return false;
  }
  return true;
}

/**
 * Observatory: insert snapshot, retrieve history, run trends; confirm read-only (no mutation of snapshot).
 */
export function verifyObservatoryLayer(): boolean {
  const service = new GovernanceObservatoryService();
  const snap = Object.freeze({
    timestamp: 1000,
    tierDistribution: Object.freeze({ A: 0.5, B: 0.5 }),
    slaDistribution: Object.freeze({ X: 1 }),
    decisionLoad: 0.5,
    overrideRate: 0.1,
    consensusRate: 0.8,
    governanceEntropy: 0.4,
    stabilityIndex: 0.85,
    systemStress: 0.2,
  });
  service.captureSnapshot(snap);
  const latest = service.getTimeline().latest();
  if (!latest || latest.timestamp !== 1000) return false;
  const range = service.getTimeline().getRange(0, 2000);
  if (range.length !== 1) return false;
  service.analyzeTrends();
  service.detectSystemRisks();
  return true;
}
