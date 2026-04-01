/**
 * Phase 11F — Predictive Governance Intelligence Layer tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runPredictiveGovernanceAnalysis,
  analyzeTrustEvolution,
  assessNodeRisk,
  computeFederationRisk,
  type TrustEvolutionPoint,
  type PredictiveGovernanceSignal,
} from '../index.js';

function point(
  node_id: string,
  organization_id: string,
  trust_index: number,
  trust_level: TrustEvolutionPoint['trust_level'],
  timestamp: number
): TrustEvolutionPoint {
  return Object.freeze({ node_id, organization_id, trust_index, trust_level, timestamp });
}

describe('Predictive Governance Intelligence', () => {
  it('Stable node evolution: trust increasing slowly → STABLE, LOW risk', () => {
    const history: TrustEvolutionPoint[] = [
      point('n1', 'org1', 0.7, 'MEDIUM', 1000),
      point('n1', 'org1', 0.72, 'MEDIUM', 2000),
      point('n1', 'org1', 0.75, 'MEDIUM', 3000),
    ];
    const evo = analyzeTrustEvolution(history);
    assert.strictEqual(evo.stability_status, 'STABLE');
    assert.ok(evo.trust_delta >= 0);
    assert.ok(evo.volatility_score < 0.05);
    const risk = assessNodeRisk(evo.stability_status, evo.volatility_score);
    assert.strictEqual(risk, 'LOW');
  });

  it('Volatile node: rapid trust oscillation → VOLATILE', () => {
    const history: TrustEvolutionPoint[] = [
      point('n1', 'org1', 0.5, 'MEDIUM', 1000),
      point('n1', 'org1', 0.8, 'HIGH', 2000),
      point('n1', 'org1', 0.45, 'LOW', 3000),
      point('n1', 'org1', 0.55, 'MEDIUM', 4000),
    ];
    const evo = analyzeTrustEvolution(history);
    assert.strictEqual(evo.stability_status, 'VOLATILE');
    assert.ok(evo.volatility_score >= 0.05);
  });

  it('Declining trust: steady decrease (delta in (-0.2, -0.1]) → DECLINING, HIGH risk', () => {
    const history: TrustEvolutionPoint[] = [
      point('n1', 'org1', 0.8, 'HIGH', 1000),
      point('n1', 'org1', 0.7, 'MEDIUM', 2000),
      point('n1', 'org1', 0.65, 'MEDIUM', 3000),
    ];
    const evo = analyzeTrustEvolution(history);
    assert.strictEqual(evo.stability_status, 'DECLINING');
    assert.ok(evo.trust_delta < -0.1 && evo.trust_delta >= -0.2);
    const risk = assessNodeRisk(evo.stability_status, evo.volatility_score);
    assert.strictEqual(risk, 'HIGH');
  });

  it('Critical trust collapse: sharp drop → CRITICAL, SYSTEMIC risk', () => {
    const history: TrustEvolutionPoint[] = [
      point('n1', 'org1', 0.9, 'HIGH', 1000),
      point('n1', 'org1', 0.6, 'MEDIUM', 2000),
    ];
    const evo = analyzeTrustEvolution(history);
    assert.strictEqual(evo.stability_status, 'CRITICAL');
    assert.ok(evo.trust_delta < -0.2);
    const risk = assessNodeRisk(evo.stability_status, evo.volatility_score);
    assert.strictEqual(risk, 'SYSTEMIC');
  });

  it('Federation systemic risk: 20 nodes with 3 critical → systemic_risk_level SYSTEMIC', () => {
    const signals: PredictiveGovernanceSignal[] = [];
    for (let i = 0; i < 17; i++) {
      signals.push(
        Object.freeze({
          node_id: `n${i}`,
          organization_id: 'org1',
          stability_status: 'STABLE',
          risk_level: 'LOW',
          trust_delta: 0,
          volatility_score: 0.02,
          evaluated_timestamp: 5000,
        })
      );
    }
    for (let i = 17; i < 20; i++) {
      signals.push(
        Object.freeze({
          node_id: `n${i}`,
          organization_id: 'org1',
          stability_status: 'CRITICAL',
          risk_level: 'SYSTEMIC',
          trust_delta: -0.3,
          volatility_score: 0.1,
          evaluated_timestamp: 5000,
        })
      );
    }
    const report = computeFederationRisk(signals, 5000);
    assert.strictEqual(report.total_nodes, 20);
    assert.strictEqual(report.critical_nodes, 3);
    assert.strictEqual(report.systemic_risk_level, 'SYSTEMIC');
  });

  it('Determinism: shuffle history order → identical analysis results', () => {
    const history: TrustEvolutionPoint[] = [
      point('n1', 'org1', 0.5, 'MEDIUM', 3000),
      point('n1', 'org1', 0.6, 'MEDIUM', 1000),
      point('n1', 'org1', 0.8, 'HIGH', 2000),
    ];
    const shuffled = [history[1], history[2], history[0]];
    const a = analyzeTrustEvolution(history);
    const b = analyzeTrustEvolution(shuffled);
    assert.strictEqual(a.trust_delta, b.trust_delta);
    assert.strictEqual(a.volatility_score, b.volatility_score);
    assert.strictEqual(a.stability_status, b.stability_status);
  });

  it('runPredictiveGovernanceAnalysis: returns signals sorted by node_id and federation_risk', () => {
    const historyByNode = new Map<string, TrustEvolutionPoint[]>();
    historyByNode.set('n2', [point('n2', 'org1', 0.7, 'MEDIUM', 1000), point('n2', 'org1', 0.72, 'MEDIUM', 2000)]);
    historyByNode.set('n1', [point('n1', 'org1', 0.8, 'HIGH', 1000), point('n1', 'org1', 0.75, 'MEDIUM', 2000)]);
    const result = runPredictiveGovernanceAnalysis(historyByNode, 3000);
    assert.strictEqual(result.signals.length, 2);
    assert.strictEqual(result.signals[0].node_id, 'n1');
    assert.strictEqual(result.signals[1].node_id, 'n2');
    assert.ok(result.federation_risk.total_nodes === 2);
    assert.ok(result.federation_risk.evaluated_timestamp === 3000);
  });
});
