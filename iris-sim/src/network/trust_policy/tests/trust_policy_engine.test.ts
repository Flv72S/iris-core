/**
 * Microstep 10E — Governance Trust Policy Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { TrustPolicyEvaluationInput } from '../types/trust_policy_types.js';
import { createTrustPolicy, validateTrustPolicy } from '../policy/trust_policy_definition.js';
import { evaluateTrustPolicy } from '../evaluation/trust_policy_evaluator.js';
import { computeTrustDecision } from '../decision/trust_decision_engine.js';
import { isNodeTrusted, getTrustDecision } from '../query/trust_policy_query.js';
import { evaluateNodeTrust } from '../engine/trust_policy_engine.js';
import type { GovernanceTrustGraph, TrustNode } from '../../trust_graph/types/trust_graph_types.js';

function makeGraph(nodes: TrustNode[], edges: { source: string; target: string; cert_id: string }[]): GovernanceTrustGraph {
  const nodeMap = new Map<string, TrustNode>();
  for (const n of nodes) nodeMap.set(n.node_id, n);
  const edgeList = edges.map((e) => ({
    source_node: e.source,
    target_node: e.target,
    certificate_id: e.cert_id,
    reason: 'verified',
  }));
  return Object.freeze({
    nodes: new Map(nodeMap),
    edges: edgeList,
  });
}

describe('Governance Trust Policy Engine', () => {
  it('1 — Policy valida', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-1',
      minimum_trust_score: 1,
      require_independent_attestations: 1,
    });
    assert.strictEqual(policy.policy_id, 'pol-1');
    assert.strictEqual(validateTrustPolicy(policy), true);
  });

  it('2 — Policy con valori invalidi', () => {
    assert.strictEqual(
      validateTrustPolicy({
        policy_id: '',
        minimum_trust_score: 0,
        require_independent_attestations: 0,
      }),
      false
    );
    assert.strictEqual(
      validateTrustPolicy({
        policy_id: 'p',
        minimum_trust_score: -1,
        require_independent_attestations: 0,
      }),
      false
    );
    assert.strictEqual(
      validateTrustPolicy({
        policy_id: 'p',
        minimum_trust_score: 0,
        require_independent_attestations: -1,
      }),
      false
    );
    assert.strictEqual(
      validateTrustPolicy({
        policy_id: 'p',
        minimum_trust_score: 0,
        require_independent_attestations: 0,
        allowed_nodes: ['a', 'b'],
        blocked_nodes: ['b', 'c'],
      }),
      false
    );
    assert.throws(() => {
      createTrustPolicy({
        policy_id: 'p',
        minimum_trust_score: -1,
        require_independent_attestations: 0,
      });
    });
  });

  it('3 — Nodo bloccato → REJECT', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-block',
      minimum_trust_score: 0,
      require_independent_attestations: 0,
      blocked_nodes: ['node-bad'],
    });
    const result = evaluateTrustPolicy(policy, {
      node_id: 'node-bad',
      trust_score: 10,
      attestations: 10,
    });
    assert.strictEqual(result.accepted, false);
    assert.strictEqual(result.reason, 'blocked');
    const decision = computeTrustDecision(policy, {
      node_id: 'node-bad',
      trust_score: 10,
      attestations: 10,
    });
    assert.strictEqual(decision.decision, 'REJECT');
  });

  it('4 — Nodo esplicitamente consentito → ACCEPT', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-allow',
      minimum_trust_score: 100,
      require_independent_attestations: 100,
      allowed_nodes: ['node-ok'],
    });
    const result = evaluateTrustPolicy(policy, {
      node_id: 'node-ok',
      trust_score: 0,
      attestations: 0,
    });
    assert.strictEqual(result.accepted, true);
    assert.strictEqual(result.reason, 'accepted');
    const decision = getTrustDecision(policy, 'node-ok', 0, 0);
    assert.strictEqual(decision.decision, 'ACCEPT');
  });

  it('5 — Trust score insufficiente → REJECT', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-score',
      minimum_trust_score: 5,
      require_independent_attestations: 0,
    });
    const result = evaluateTrustPolicy(policy, {
      node_id: 'n',
      trust_score: 3,
      attestations: 10,
    });
    assert.strictEqual(result.accepted, false);
    assert.strictEqual(result.reason, 'insufficient_trust_score');
  });

  it('6 — Attestazioni insufficienti → REJECT', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-att',
      minimum_trust_score: 0,
      require_independent_attestations: 3,
    });
    const result = evaluateTrustPolicy(policy, {
      node_id: 'n',
      trust_score: 5,
      attestations: 2,
    });
    assert.strictEqual(result.accepted, false);
    assert.strictEqual(result.reason, 'insufficient_attestations');
  });

  it('7 — Nodo valido → ACCEPT', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-valid',
      minimum_trust_score: 1,
      require_independent_attestations: 1,
    });
    const result = evaluateTrustPolicy(policy, {
      node_id: 'n',
      trust_score: 2,
      attestations: 2,
    });
    assert.strictEqual(result.accepted, true);
    assert.strictEqual(result.reason, 'accepted');
  });

  it('8 — Decision engine corretto', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-d',
      minimum_trust_score: 1,
      require_independent_attestations: 1,
    });
    const accept = computeTrustDecision(policy, {
      node_id: 'a',
      trust_score: 2,
      attestations: 2,
    });
    const reject = computeTrustDecision(policy, {
      node_id: 'b',
      trust_score: 0,
      attestations: 0,
    });
    assert.strictEqual(accept.decision, 'ACCEPT');
    assert.strictEqual(accept.policy_id, 'pol-d');
    assert.strictEqual(accept.node_id, 'a');
    assert.strictEqual(reject.decision, 'REJECT');
    assert.strictEqual(reject.policy_id, 'pol-d');
  });

  it('9 — Query API funzionante', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-q',
      minimum_trust_score: 1,
      require_independent_attestations: 1,
    });
    assert.strictEqual(isNodeTrusted(policy, 'x', 2, 2), true);
    assert.strictEqual(isNodeTrusted(policy, 'y', 0, 0), false);
    const dec = getTrustDecision(policy, 'x', 2, 2);
    assert.strictEqual(dec.decision, 'ACCEPT');
    assert.strictEqual(dec.node_id, 'x');
  });

  it('10 — Determinismo completo', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-det',
      minimum_trust_score: 2,
      require_independent_attestations: 2,
    });
    const input: TrustPolicyEvaluationInput = {
      node_id: 'node-det',
      trust_score: 3,
      attestations: 3,
    };
    const d1 = computeTrustDecision(policy, input);
    const d2 = computeTrustDecision(policy, input);
    assert.deepStrictEqual(d1, d2);
    const graph = makeGraph(
      [
        { node_id: 'local', public_key: 'pk' },
        { node_id: 'node-det', public_key: 'pk2' },
      ],
      [
        { source: 'local', target: 'node-det', cert_id: 'c1' },
        { source: 'local', target: 'node-det', cert_id: 'c2' },
        { source: 'local', target: 'node-det', cert_id: 'c3' },
      ]
    );
    const e1 = evaluateNodeTrust(policy, graph, 'node-det');
    const e2 = evaluateNodeTrust(policy, graph, 'node-det');
    assert.deepStrictEqual(e1, e2);
    assert.strictEqual(e1.decision, 'ACCEPT');
  });
});

describe('Trust Policy Engine + Graph', () => {
  it('evaluateNodeTrust uses graph for score and attestations', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-g',
      minimum_trust_score: 2,
      require_independent_attestations: 2,
    });
    const graph = makeGraph(
      [
        { node_id: 'verifier', public_key: 'pk0' },
        { node_id: 'target', public_key: 'pk1' },
      ],
      [
        { source: 'verifier', target: 'target', cert_id: 'cert-a' },
        { source: 'verifier', target: 'target', cert_id: 'cert-b' },
      ]
    );
    const decision = evaluateNodeTrust(policy, graph, 'target');
    assert.strictEqual(decision.decision, 'ACCEPT');
    assert.strictEqual(decision.policy_id, 'pol-g');
    assert.strictEqual(decision.node_id, 'target');
  });

  it('evaluateNodeTrust REJECT when attestations from graph are insufficient', () => {
    const policy = createTrustPolicy({
      policy_id: 'pol-low',
      minimum_trust_score: 0,
      require_independent_attestations: 2,
    });
    const graph = makeGraph(
      [
        { node_id: 'v', public_key: 'pk' },
        { node_id: 't', public_key: 'pk2' },
      ],
      [{ source: 'v', target: 't', cert_id: 'only-one' }]
    );
    const decision = evaluateNodeTrust(policy, graph, 't');
    assert.strictEqual(decision.decision, 'REJECT');
  });
});
