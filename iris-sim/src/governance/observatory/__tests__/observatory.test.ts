/**
 * Step 7E — Governance Observatory tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  GovernanceTimeline,
  GovernanceMetricEngine,
  GovernanceTrendAnalyzer,
  GovernanceRiskDetector,
  GovernanceObservatoryService,
  GovernanceObservatoryAPI,
} from '../index.js';
import type { GovernanceSnapshot } from '../GovernanceSnapshot.js';
import { generateObservatoryDataset } from './observatoryDataset.js';

function snapshot(overrides: Partial<GovernanceSnapshot>): GovernanceSnapshot {
  return Object.freeze({
    timestamp: Date.now(),
    tierDistribution: { TIER_2_CONTROLLED: 1 },
    slaDistribution: { ENTERPRISE: 1 },
    decisionLoad: 0.5,
    overrideRate: 0.1,
    consensusRate: 0.8,
    governanceEntropy: 0.4,
    stabilityIndex: 0.85,
    systemStress: 0.2,
    ...overrides,
  });
}

describe('Step 7E — Governance Observatory', () => {
  it('snapshot storage and timeline query', () => {
    const timeline = new GovernanceTimeline();
    assert.strictEqual(timeline.latest(), null);
    const s1 = snapshot({ timestamp: 1000 });
    const s2 = snapshot({ timestamp: 2000 });
    timeline.add(s1);
    timeline.add(s2);
    assert.strictEqual(timeline.latest(), s2);
    assert.strictEqual(timeline.length(), 2);
    const range = timeline.getRange(1000, 2000);
    assert.strictEqual(range.length, 2);
    assert.strictEqual(timeline.getRange(1500, 2500).length, 1);
  });

  it('metric computation', () => {
    const engine = new GovernanceMetricEngine();
    const s = snapshot({
      tierDistribution: { A: 0.5, B: 0.5 },
      consensusRate: 0.9,
    });
    const entropy = engine.computeEntropy(s);
    assert.ok(entropy >= 0 && entropy <= 1);
    const prev = snapshot({ timestamp: 0, decisionLoad: 0.2 });
    const curr = snapshot({ timestamp: 10000, decisionLoad: 0.5 });
    const velocity = engine.computeDecisionVelocity(prev, curr);
    assert.ok(velocity >= 0 && velocity <= 1);
    const stability = engine.computeConsensusStability([s, s, s]);
    assert.ok(stability >= 0 && stability <= 1);
  });

  it('trend detection', () => {
    const analyzer = new GovernanceTrendAnalyzer();
    assert.strictEqual(analyzer.detectTrend([1, 2, 3, 4, 5]), 'rising');
    assert.strictEqual(analyzer.detectTrend([5, 4, 3, 2, 1]), 'falling');
    assert.strictEqual(analyzer.detectTrend([1, 1, 1, 1]), 'stable');
    assert.strictEqual(typeof analyzer.detectAcceleration([1, 2, 3, 5, 8]), 'boolean');
    assert.strictEqual(typeof analyzer.detectInstability([0.1, 0.9, 0.2, 0.8]), 'boolean');
    assert.strictEqual(typeof analyzer.detectStabilization([0.5, 0.6, 0.4, 0.55, 0.52, 0.53]), 'boolean');
  });

  it('risk detection', () => {
    const detector = new GovernanceRiskDetector();
    const highOverride = [snapshot({ overrideRate: 0.9, consensusRate: 0.5 })];
    const risksOverride = detector.detectRisks(highOverride);
    assert.ok(risksOverride.some((r) => r.type === 'Override Explosion'));
    const lowConsensus = [snapshot({ consensusRate: 0.1 })];
    assert.ok(detector.detectRisks(lowConsensus).some((r) => r.type === 'Consensus Collapse'));
    const lowRisk = [
      snapshot({
        overrideRate: 0.05,
        consensusRate: 0.9,
        governanceEntropy: 0.3,
        tierDistribution: { A: 0.3, B: 0.3, C: 0.4 },
        stabilityIndex: 0.9,
        systemStress: 0.1,
        decisionLoad: 0.3,
      }),
    ];
    const lowRisks = detector.detectRisks(lowRisk);
    assert.strictEqual(lowRisks.length, 0, 'low-risk snapshot should trigger no risks');
  });

  it('service capture and analyze', () => {
    const service = new GovernanceObservatoryService();
    const s = snapshot({ timestamp: 1000 });
    service.captureSnapshot(s);
    const report = service.analyzeTrends();
    assert.strictEqual(report.periodStart, 1000);
    assert.strictEqual(report.periodEnd, 1000);
    assert.ok(['rising', 'falling', 'stable'].includes(report.entropyTrend));
    const risks = service.detectSystemRisks();
    assert.ok(Array.isArray(risks));
  });

  it('API getSnapshotLatest, getTimeline, getTrends, getRisks', () => {
    const api = new GovernanceObservatoryAPI();
    assert.strictEqual(api.getSnapshotLatest(), null);
    const snap = snapshot({ timestamp: 2000 });
    api.getService().captureSnapshot(snap);
    assert.strictEqual(api.getSnapshotLatest(), snap);
    const timeline = api.getTimeline();
    assert.strictEqual(timeline.length, 1);
    const trends = api.getTrends();
    assert.ok(trends.periodStart <= trends.periodEnd);
    assert.ok(Array.isArray(api.getRisks()));
  });

  it('longitudinal dataset and trends', () => {
    const base = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const dataset = generateObservatoryDataset(base, 123);
    assert.strictEqual(dataset.length, 365);
    const service = new GovernanceObservatoryService();
    for (const s of dataset) service.captureSnapshot(s);
    const report = service.analyzeTrends();
    assert.strictEqual(report.periodStart, base);
    assert.ok(report.periodEnd >= report.periodStart);
    assert.ok(['rising', 'falling', 'stable'].includes(report.entropyTrend));
    const risks = service.detectSystemRisks();
    assert.ok(Array.isArray(risks));
  });
});
