/**
 * Phase 7 Final Verification — Deterministic test scenarios (read-only).
 */

import type { GovernanceSnapshotForTiering } from '../tiering/hardCaps.js';
import type { GovernanceTier } from '../tiering/hysteresis.js';

export interface VerificationScenario {
  readonly name: string;
  readonly snapshot: GovernanceSnapshotForTiering;
  readonly expectedTier?: GovernanceTier;
  readonly expectHardCap?: boolean;
  readonly expectStructuralCap?: boolean;
}

function scenario(
  name: string,
  snapshot: GovernanceSnapshotForTiering,
  expectedTier?: GovernanceTier,
  expectHardCap?: boolean,
  expectStructuralCap?: boolean
): VerificationScenario {
  const out: {
    name: string;
    snapshot: GovernanceSnapshotForTiering;
    expectedTier?: GovernanceTier;
    expectHardCap?: boolean;
    expectStructuralCap?: boolean;
  } = { name, snapshot };
  if (expectedTier !== undefined) out.expectedTier = expectedTier;
  if (expectHardCap !== undefined) out.expectHardCap = expectHardCap;
  if (expectStructuralCap !== undefined) out.expectStructuralCap = expectStructuralCap;
  return Object.freeze(out) as VerificationScenario;
}

const base = (
  overrides: Partial<GovernanceSnapshotForTiering>
): GovernanceSnapshotForTiering =>
  Object.freeze({
    mode: 'NORMAL',
    budgetMultiplier: 0.95,
    commitRateMultiplier: 0.95,
    adaptationDampening: 0.1,
    confidence: 0.95,
    ...overrides,
  });

/** Scenario 1 — Perfect Governance: low flipRate, zero violations, stable entropy → TIER_4 */
export const SCENARIO_PERFECT_GOVERNANCE: VerificationScenario = scenario(
  'Perfect Governance',
  base({
    flipRate: 0.02,
    entropyIndex: 0.1,
    invariantViolationCount: 0,
    violationFrequency: 0,
  }),
  'TIER_4_ENTERPRISE_READY'
);

/** Scenario 2 — Minor Instability: medium flipRate, no violations → TIER_3 */
export const SCENARIO_MINOR_INSTABILITY: VerificationScenario = scenario(
  'Minor Instability',
  base({
    flipRate: 0.08,
    entropyIndex: 0.25,
    invariantViolationCount: 0,
    violationFrequency: 0,
  }),
  'TIER_3_STABLE'
);

/** Scenario 3 — Invariant Violation: invariantViolationCount > 0 → hard cap, tier ≤ TIER_2 */
export const SCENARIO_INVARIANT_VIOLATION: VerificationScenario = scenario(
  'Invariant Violation',
  base({
    flipRate: 0.05,
    entropyIndex: 0.2,
    invariantViolationCount: 1,
    violationFrequency: 0.1,
  }),
  'TIER_2_CONTROLLED',
  true
);

/** Scenario 4 — High Entropy: high entropyIndex → score penalization */
export const SCENARIO_HIGH_ENTROPY: VerificationScenario = scenario(
  'High Entropy',
  base({
    flipRate: 0.1,
    entropyIndex: 0.9,
    invariantViolationCount: 0,
    violationFrequency: 0,
  })
);

/** Scenario 5 — Anti-Gaming Attempt: some metrics high, some low → structural floor/cap */
export const SCENARIO_ANTI_GAMING: VerificationScenario = scenario(
  'Anti-Gaming Attempt',
  base({
    flipRate: 0.02,
    entropyIndex: 0.1,
    invariantViolationCount: 3,
    violationFrequency: 1.5,
  }),
  undefined,
  false,
  true
);

export const VERIFICATION_SCENARIOS: readonly VerificationScenario[] =
  Object.freeze([
    SCENARIO_PERFECT_GOVERNANCE,
    SCENARIO_MINOR_INSTABILITY,
    SCENARIO_INVARIANT_VIOLATION,
    SCENARIO_HIGH_ENTROPY,
    SCENARIO_ANTI_GAMING,
  ]);
