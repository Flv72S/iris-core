/**
 * Step 7C — Commercial packaging & feature gating tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateFeatureAccess,
  evaluateAllFeatures,
  evaluatePackageEligibility,
  generateCommercialSnapshot,
  tierSatisfiesMinimum,
} from '../index.js';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { GovernanceCertification } from '../../certification/certification.js';

function tierSnapshot(tier: GovernanceTierSnapshot['tier']): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: tier === 'TIER_0_LOCKED' ? 0.3 : tier === 'TIER_1_RESTRICTED' ? 0.5 : tier === 'TIER_2_CONTROLLED' ? 0.65 : tier === 'TIER_3_STABLE' ? 0.8 : 0.95,
    tier,
    computedAt: 1000000,
    normalizedMetrics: Object.freeze({
      flipStability: 0.9,
      invariantIntegrity: 0.9,
      entropyControl: 0.9,
      violationPressure: 0.9,
    }),
    hardCapApplied: false,
    structuralCapApplied: false,
  });
}

function mockCertification(tier: GovernanceCertification['tier']): GovernanceCertification {
  return Object.freeze({
    certificationVersion: '7B_v1.0',
    modelVersion: '7A_v1.0',
    payloadHash: 'abc',
    signature: new Uint8Array(64),
    publicKey: new Uint8Array(32),
    tier,
    score: 0.9,
    computedAt: 1000000,
    normalizedMetrics: Object.freeze({ flipStability: 0.9, invariantIntegrity: 0.9, entropyControl: 0.9, violationPressure: 0.9 }),
  });
}

describe('Step 7C — Commercial', () => {
  it('1. TIER_0 → solo feature base', () => {
    const snap = tierSnapshot('TIER_0_LOCKED');
    const decisions = evaluateAllFeatures(snap, null);
    const basic = decisions.find((d) => d.feature === 'BASIC_SIGNAL_VIEW');
    assert.strictEqual(basic?.allowed, true);
    const dashboard = decisions.find((d) => d.feature === 'GOVERNANCE_DASHBOARD');
    assert.strictEqual(dashboard?.allowed, false);
    const analytics = decisions.find((d) => d.feature === 'GOVERNANCE_ANALYTICS');
    assert.strictEqual(analytics?.allowed, false);
    const allowedCount = decisions.filter((d) => d.allowed).length;
    assert.strictEqual(allowedCount, 1);
  });

  it('2. TIER_2 → accesso analytics', () => {
    const snap = tierSnapshot('TIER_2_CONTROLLED');
    const decisions = evaluateAllFeatures(snap, null);
    const analytics = decisions.find((d) => d.feature === 'GOVERNANCE_ANALYTICS');
    assert.strictEqual(analytics?.allowed, true);
    const auditLogs = decisions.find((d) => d.feature === 'ADVANCED_AUDIT_LOGS');
    assert.strictEqual(auditLogs?.allowed, true);
    const certExport = decisions.find((d) => d.feature === 'CERTIFICATION_EXPORT');
    assert.strictEqual(certExport?.allowed, false);
  });

  it('3. TIER_3 senza certificazione → feature certificate bloccate', () => {
    const snap = tierSnapshot('TIER_3_STABLE');
    const decisions = evaluateAllFeatures(snap, null);
    const certExport = decisions.find((d) => d.feature === 'CERTIFICATION_EXPORT');
    assert.strictEqual(certExport?.allowed, false);
    assert.strictEqual(certExport?.reason, 'CERTIFICATION_REQUIRED');
    const stressSim = decisions.find((d) => d.feature === 'STRESS_SIMULATION');
    assert.strictEqual(stressSim?.allowed, false);
  });

  it('4. certificazione valida → sblocco feature', () => {
    const snap = tierSnapshot('TIER_3_STABLE');
    const cert = mockCertification('TIER_3_STABLE');
    const certExport = evaluateFeatureAccess('CERTIFICATION_EXPORT', snap, cert);
    assert.strictEqual(certExport.allowed, true);
    const stressSim = evaluateFeatureAccess('STRESS_SIMULATION', snap, cert);
    assert.strictEqual(stressSim.allowed, false, 'stress simulation still requires stressTestPassed');
    const stressWithContext = evaluateFeatureAccess('STRESS_SIMULATION', snap, cert, { stressTestPassed: true });
    assert.strictEqual(stressWithContext.allowed, true);
  });

  it('5. TIER_4 → tutte le feature attive', () => {
    const snap = tierSnapshot('TIER_4_ENTERPRISE_READY');
    const cert = mockCertification('TIER_4_ENTERPRISE_READY');
    const decisions = evaluateAllFeatures(snap, cert, { stressTestPassed: true });
    const allAllowed = decisions.every((d) => d.allowed);
    assert.strictEqual(allAllowed, true);
  });

  it('6. downgrade tier → feature bloccate correttamente', () => {
    const snapHigh = tierSnapshot('TIER_3_STABLE');
    const snapLow = tierSnapshot('TIER_1_RESTRICTED');
    const cert = mockCertification('TIER_3_STABLE');
    const auditHigh = evaluateFeatureAccess('ADVANCED_AUDIT_LOGS', snapHigh, cert);
    const auditLow = evaluateFeatureAccess('ADVANCED_AUDIT_LOGS', snapLow, cert);
    assert.strictEqual(auditHigh.allowed, true);
    assert.strictEqual(auditLow.allowed, false);
    assert.strictEqual(auditLow.reason, 'TIER_BELOW_MINIMUM');
  });

  it('7. determinismo snapshot commerciale', () => {
    const snap = tierSnapshot('TIER_2_CONTROLLED');
    const cert = mockCertification('TIER_2_CONTROLLED');
    const a = generateCommercialSnapshot(snap, cert);
    const b = generateCommercialSnapshot(snap, cert);
    assert.strictEqual(a.modelVersion, b.modelVersion);
    assert.strictEqual(a.tier, b.tier);
    assert.deepStrictEqual([...a.availablePackages], [...b.availablePackages]);
    assert.strictEqual(a.featureAccess.length, b.featureAccess.length);
    for (let i = 0; i < a.featureAccess.length; i++) {
      assert.strictEqual(a.featureAccess[i].feature, b.featureAccess[i].feature);
      assert.strictEqual(a.featureAccess[i].allowed, b.featureAccess[i].allowed);
    }
  });
});

describe('Package eligibility', () => {
  it('TIER_0 → COMMUNITY only', () => {
    const pkgs = evaluatePackageEligibility(tierSnapshot('TIER_0_LOCKED'));
    assert.deepStrictEqual([...pkgs], ['COMMUNITY']);
  });

  it('TIER_2 → COMMUNITY, PROFESSIONAL, ENTERPRISE', () => {
    const pkgs = evaluatePackageEligibility(tierSnapshot('TIER_2_CONTROLLED'));
    assert.ok(pkgs.includes('COMMUNITY'));
    assert.ok(pkgs.includes('PROFESSIONAL'));
    assert.ok(pkgs.includes('ENTERPRISE'));
    assert.ok(!pkgs.includes('SOVEREIGN'));
  });

  it('TIER_4 → all packages', () => {
    const pkgs = evaluatePackageEligibility(tierSnapshot('TIER_4_ENTERPRISE_READY'));
    assert.strictEqual(pkgs.length, 4);
    assert.ok(pkgs.includes('SOVEREIGN'));
  });
});

describe('tierSatisfiesMinimum', () => {
  it('same tier satisfies', () => {
    assert.strictEqual(tierSatisfiesMinimum('TIER_2_CONTROLLED', 'TIER_2_CONTROLLED'), true);
  });
  it('higher tier satisfies', () => {
    assert.strictEqual(tierSatisfiesMinimum('TIER_4_ENTERPRISE_READY', 'TIER_0_LOCKED'), true);
  });
  it('lower tier does not satisfy', () => {
    assert.strictEqual(tierSatisfiesMinimum('TIER_1_RESTRICTED', 'TIER_2_CONTROLLED'), false);
  });
});
