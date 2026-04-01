/**
 * Stability Step 5C — Regime dynamics analyzer tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RegimeDynamicsAnalyzer } from './dynamicsAnalyzer.js';
import { DefaultMonitoringConfig } from './dynamicsTypes.js';

function snap(t: number, si: number, envelope: 'SAFE' | 'STRESS' | 'CRITICAL') {
  return Object.freeze({ timestamp: t, stabilityIndex: si, envelopeState: envelope });
}

describe('RegimeDynamicsAnalyzer', () => {
  it('gradual convergence: SI 0.6→0.91 flat → CONVERGED', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const seq = [0.6, 0.7, 0.8, 0.85, 0.9, 0.91, 0.91, 0.91, 0.91, 0.91];
    for (let i = 0; i < seq.length; i++) {
      analyzer.observe(snap(1000 + i * 100, seq[i], 'SAFE'));
    }
    const report = analyzer.getDynamicsReport();
    assert.strictEqual(report.convergenceStatus, 'CONVERGED');
  });

  it('oscillation: SI up-down → not CONVERGED', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const seq = [0.8, 0.6, 0.85, 0.55, 0.82, 0.6];
    for (let i = 0; i < seq.length; i++) {
      analyzer.observe(snap(1000 + i * 100, seq[i], 'SAFE'));
    }
    const report = analyzer.getDynamicsReport();
    assert.notStrictEqual(report.convergenceStatus, 'CONVERGED');
  });

  it('frequent transitions → residualInstabilityScore > 0.6', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const envelopes: Array<'SAFE' | 'STRESS' | 'CRITICAL'> = ['SAFE', 'STRESS', 'SAFE', 'STRESS', 'CRITICAL', 'SAFE'];
    for (let i = 0; i < envelopes.length; i++) {
      analyzer.observe(snap(1000 + i * 50, 0.7, envelopes[i]));
    }
    const report = analyzer.getDynamicsReport();
    assert.ok(report.residualInstabilityScore > 0.6);
  });

  it('recovery monotonic CRITICAL→STRESS→SAFE → CONVERGED confidence > 0.7', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const siSeq = [0.3, 0.5, 0.65, 0.8, 0.88, 0.92, 0.92, 0.92, 0.92, 0.92];
    const envSeq: Array<'SAFE' | 'STRESS' | 'CRITICAL'> = ['CRITICAL', 'CRITICAL', 'STRESS', 'STRESS', 'SAFE', 'SAFE', 'SAFE', 'SAFE', 'SAFE', 'SAFE'];
    for (let i = 0; i < siSeq.length; i++) {
      analyzer.observe(snap(1000 + i * 200, siSeq[i], envSeq[i]));
    }
    const report = analyzer.getDynamicsReport();
    assert.strictEqual(report.convergenceStatus, 'CONVERGED');
    assert.ok(report.convergenceConfidence > 0.7);
  });
});

describe('Step 5C.1 hardening', () => {
  it('isolated shock: stable sequence with single outlier → shockDetected, robust oscillation low, CONVERGED', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const base = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
    for (let i = 0; i < base.length; i++) {
      const si = i === 4 ? 0.3 : base[i];
      analyzer.observe(snap(1000 + i * 100, si, 'SAFE'));
    }
    const report = analyzer.getDynamicsReport();
    assert.strictEqual(report.shockDetected, true);
    assert.ok(report.trajectoryStabilityScore > 0.5);
    assert.strictEqual(report.convergenceStatus, 'CONVERGED');
  });

  it('structural oscillation: repeated up-down pattern → shockDetected false, robust oscillation high, NOT CONVERGED', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const seq = [0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4];
    for (let i = 0; i < seq.length; i++) {
      analyzer.observe(snap(1000 + i * 100, seq[i], 'SAFE'));
    }
    const report = analyzer.getDynamicsReport();
    assert.strictEqual(report.shockDetected, false);
    assert.ok(report.trajectoryStabilityScore < 0.8);
    assert.notStrictEqual(report.convergenceStatus, 'CONVERGED');
  });

  it('fragile plateau: SI stable around 0.45 → plateauStrength FRAGILE, NOT CONVERGED', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const seq = [0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45];
    for (let i = 0; i < seq.length; i++) {
      analyzer.observe(snap(1000 + i * 100, seq[i], 'SAFE'));
    }
    const report = analyzer.getDynamicsReport();
    assert.strictEqual(report.plateauStrength, 'FRAGILE');
    assert.notStrictEqual(report.convergenceStatus, 'CONVERGED');
  });

  it('meta-stability: low oscillation but frequent SAFE/STRESS micro-transitions → metaStability true, residual medium-high', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 50);
    const env: Array<'SAFE' | 'STRESS'> = ['SAFE', 'STRESS', 'SAFE', 'STRESS', 'SAFE', 'STRESS', 'SAFE', 'STRESS', 'SAFE', 'STRESS'];
    for (let i = 0; i < env.length; i++) {
      analyzer.observe(snap(1000 + i * 50, 0.88, env[i]));
    }
    const report = analyzer.getDynamicsReport();
    assert.strictEqual(report.metaStability, true);
    assert.ok(report.residualInstabilityScore >= 0.2);
  });

  it('stress 1000 random snapshots: no crash, no NaN, residual in [0,1]', () => {
    const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 150);
    for (let i = 0; i < 1000; i++) {
      const si = Math.random();
      const env = (['SAFE', 'STRESS', 'CRITICAL'] as const)[Math.floor(Math.random() * 3)];
      analyzer.observe(snap(1000 + i, si, env));
    }
    const report = analyzer.getDynamicsReport();
    assert.ok(!Number.isNaN(report.residualInstabilityScore));
    assert.ok(report.residualInstabilityScore >= 0 && report.residualInstabilityScore <= 1);
  });
});

describe('dynamics stress', () => {
  it('300 random snapshots: false positive convergence rate < 5%', () => {
    let falsePositives = 0;
    const runs = 100;
    for (let r = 0; r < runs; r++) {
      const analyzer = new RegimeDynamicsAnalyzer(DefaultMonitoringConfig, 100);
      for (let i = 0; i < 300; i++) {
        const si = 0.5 + 0.4 * Math.sin(i * 0.3) + 0.1 * (Math.random() - 0.5);
        const envIdx = Math.floor(Math.random() * 3);
        const envelope = (['SAFE', 'STRESS', 'CRITICAL'] as const)[envIdx];
        analyzer.observe(snap(1000 + i * 10, Math.max(0, Math.min(1, si)), envelope));
      }
      const report = analyzer.getDynamicsReport();
      if (report.convergenceStatus === 'CONVERGED' && report.convergenceConfidence > 0.8) {
        falsePositives++;
      }
    }
    const rate = falsePositives / runs;
    assert.ok(rate < 0.05);
  });
});
