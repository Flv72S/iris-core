/**
 * Step 9J — Governance Trust Index Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  GovernanceTrustIndexInput,
  GovernanceTrustIndexReport,
} from '../types/governance_trust_index_types.js';
import { generateGovernanceTrustIndex } from '../engine/governance_trust_index_engine.js';
import { calculateGovernanceTrustScore } from '../scoring/governance_trust_scoring.js';
import { verifyGovernanceTrustIndex } from '../verify/governance_trust_index_verifier.js';

function makeInput(overrides: {
  total_events?: number;
  anomaly_count?: number;
  invariants?: { passed: boolean }[];
  telemetry_hash?: string;
  anomaly_hash?: string;
  proof_hash?: string;
}): GovernanceTrustIndexInput {
  const telemetry_hash = overrides.telemetry_hash ?? 'th1';
  const anomaly_hash = overrides.anomaly_hash ?? 'ah1';
  const proof_hash = overrides.proof_hash ?? 'ph1';
  const anomalies = Array.from(
    { length: overrides.anomaly_count ?? 0 },
    (_, i) => ({
      anomaly_id: `a-${i}`,
      description: `anomaly ${i}`,
      severity: 'low' as const,
    })
  );
  const invariants = (overrides.invariants ?? [{ passed: true }, { passed: true }]).map(
    (p, i): { invariant_name: string; passed: boolean; details?: string } => ({
      invariant_name: `inv-${i}`,
      passed: p.passed,
    })
  );

  return {
    telemetry: {
      source_observatory_hash: 'soh',
      metrics: {
        total_events: overrides.total_events ?? 50,
        snapshot_events: 10,
        diff_events: 20,
        compliance_events: 10,
        incident_events: 10,
      },
      telemetry_hash,
    },
    anomaly_report: {
      source_telemetry_hash: telemetry_hash,
      anomalies,
      anomaly_detected: anomalies.length > 0,
      anomaly_hash,
    },
    safety_proof: {
      snapshot_hash: 'sh',
      telemetry_hash,
      anomaly_hash,
      invariants,
      proof_hash,
    },
  };
}

describe('Governance Trust Index Engine', () => {
  it('1 — Trust index generation', () => {
    const input = makeInput({ total_events: 80, anomaly_count: 0 });
    const report = generateGovernanceTrustIndex(input);
    assert.ok(report);
    assert.strictEqual(report.telemetry_hash, 'th1');
    assert.strictEqual(report.anomaly_hash, 'ah1');
    assert.strictEqual(report.safety_proof_hash, 'ph1');
    assert.strictEqual(typeof report.trust_score, 'number');
    assert.ok(report.breakdown);
    assert.strictEqual(typeof report.trust_index_hash, 'string');
    assert.ok(report.trust_index_hash.length > 0);
  });

  it('2 — Telemetry scoring', () => {
    const inputLow = makeInput({ total_events: 30 });
    const inputCap = makeInput({ total_events: 100 });
    const inputOver = makeInput({ total_events: 200 });
    assert.strictEqual(calculateGovernanceTrustScore(inputLow).telemetry_score, 30);
    assert.strictEqual(calculateGovernanceTrustScore(inputCap).telemetry_score, 100);
    assert.strictEqual(calculateGovernanceTrustScore(inputOver).telemetry_score, 100);
  });

  it('3 — Anomaly scoring', () => {
    assert.strictEqual(calculateGovernanceTrustScore(makeInput({ anomaly_count: 0 })).anomaly_score, 100);
    assert.strictEqual(calculateGovernanceTrustScore(makeInput({ anomaly_count: 5 })).anomaly_score, 75);
    assert.strictEqual(calculateGovernanceTrustScore(makeInput({ anomaly_count: 20 })).anomaly_score, 0);
    assert.strictEqual(calculateGovernanceTrustScore(makeInput({ anomaly_count: 25 })).anomaly_score, 0);
  });

  it('4 — Safety scoring', () => {
    const allPassed = makeInput({ invariants: [{ passed: true }, { passed: true }] });
    const halfPassed = makeInput({ invariants: [{ passed: true }, { passed: false }] });
    const nonePassed = makeInput({ invariants: [{ passed: false }, { passed: false }] });
    const empty = makeInput({ invariants: [] });
    assert.strictEqual(calculateGovernanceTrustScore(allPassed).safety_score, 100);
    assert.strictEqual(calculateGovernanceTrustScore(halfPassed).safety_score, 50);
    assert.strictEqual(calculateGovernanceTrustScore(nonePassed).safety_score, 0);
    assert.strictEqual(calculateGovernanceTrustScore(empty).safety_score, 100);
  });

  it('5 — Trust score formula', () => {
    const input = makeInput({
      total_events: 100,
      anomaly_count: 0,
      invariants: [{ passed: true }, { passed: true }],
    });
    const breakdown = calculateGovernanceTrustScore(input);
    assert.strictEqual(breakdown.telemetry_score, 100);
    assert.strictEqual(breakdown.anomaly_score, 100);
    assert.strictEqual(breakdown.safety_score, 100);
    const report = generateGovernanceTrustIndex(input);
    const expected = 100 * 0.3 + 100 * 0.3 + 100 * 0.4;
    assert.strictEqual(report.trust_score, expected);
    assert.strictEqual(report.trust_score, 100);
  });

  it('6 — Determinism', () => {
    const input = makeInput({ total_events: 42, anomaly_count: 3 });
    const a = generateGovernanceTrustIndex(input);
    const b = generateGovernanceTrustIndex(input);
    assert.strictEqual(a.trust_score, b.trust_score);
    assert.strictEqual(a.trust_index_hash, b.trust_index_hash);
    assert.strictEqual(a.breakdown.telemetry_score, b.breakdown.telemetry_score);
    assert.strictEqual(a.breakdown.anomaly_score, b.breakdown.anomaly_score);
    assert.strictEqual(a.breakdown.safety_score, b.breakdown.safety_score);
  });

  it('7 — Verifier positive', () => {
    const input = makeInput({ total_events: 50, anomaly_count: 2 });
    const report = generateGovernanceTrustIndex(input);
    assert.strictEqual(verifyGovernanceTrustIndex(input, report), true);
  });

  it('8 — Tampering detection', () => {
    const input = makeInput({ total_events: 50 });
    const report = generateGovernanceTrustIndex(input);
    const tampered: GovernanceTrustIndexReport = {
      ...report,
      trust_index_hash: report.trust_index_hash + 'x',
    };
    assert.strictEqual(verifyGovernanceTrustIndex(input, tampered), false);
  });
});
