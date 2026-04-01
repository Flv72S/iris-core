/**
 * Microstep 10L — Governance Consensus Preparation Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceAttestation } from '../types/consensus_types.js';
import { AttestationRegistry } from '../attestation/attestation_registry.js';
import { computeQuorum } from '../quorum/quorum_engine.js';
import { buildGovernanceProof } from '../proof/governance_proof_builder.js';
import { createConsensusProposal } from '../proposal/consensus_proposal_builder.js';
import { buildConsensusContext } from '../context/consensus_context_builder.js';
import { prepareConsensusContext } from '../engine/consensus_preparation_engine.js';
import {
  getConsensusProposal,
  getConsensusQuorum,
  getGovernanceProof,
} from '../query/consensus_query_api.js';
import type { FederatedTrustGraph, FederationSnapshot } from '../../trust_federation/types/federation_types.js';
import { createFederationSnapshot } from '../../trust_federation/snapshot/federation_snapshot_engine.js';

const FIXED_TS = 1000000;

function makeFederationSnapshot(nodeCount: number): FederationSnapshot {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    node_id: `node-${i}`,
    trust_score: 0,
  }));
  return createFederationSnapshot(
    Object.freeze({ nodes, edges: [] }),
    FIXED_TS
  );
}

describe('Governance Consensus Preparation Layer', () => {
  it('1 — Creazione attestation', () => {
    const att: GovernanceAttestation = Object.freeze({
      node_id: 'n1',
      snapshot_hash: 'hash-abc',
      timestamp: FIXED_TS,
    });
    assert.strictEqual(att.node_id, 'n1');
    assert.strictEqual(att.snapshot_hash, 'hash-abc');
    assert.strictEqual(att.timestamp, FIXED_TS);
  });

  it('2 — Registro attestazioni', () => {
    const registry = new AttestationRegistry();
    registry.addAttestation({
      node_id: 'a',
      snapshot_hash: 's1',
      timestamp: FIXED_TS,
    });
    registry.addAttestation({
      node_id: 'b',
      snapshot_hash: 's1',
      timestamp: FIXED_TS,
    });
    const forS1 = registry.getAttestations('s1');
    assert.strictEqual(forS1.length, 2);
    registry.addAttestation({
      node_id: 'a',
      snapshot_hash: 's1',
      timestamp: FIXED_TS + 1,
    });
    assert.strictEqual(registry.getAttestations('s1').length, 2);
  });

  it('3 — Calcolo quorum', () => {
    const graph: FederatedTrustGraph = Object.freeze({
      nodes: [
        { node_id: 'n1', trust_score: 0 },
        { node_id: 'n2', trust_score: 0 },
        { node_id: 'n3', trust_score: 0 },
      ],
      edges: [],
    });
    const quorum = computeQuorum(graph);
    assert.strictEqual(quorum.required_nodes, 2);
    assert.strictEqual(quorum.trust_threshold, 0.7);
  });

  it('4 — Costruzione governance proof', () => {
    const attestations: GovernanceAttestation[] = [
      { node_id: 'n2', snapshot_hash: 'h', timestamp: FIXED_TS },
      { node_id: 'n1', snapshot_hash: 'h', timestamp: FIXED_TS },
    ];
    const proof = buildGovernanceProof('h', attestations);
    assert.strictEqual(proof.snapshot_hash, 'h');
    assert.strictEqual(proof.attestations.length, 2);
    assert.strictEqual(proof.attestations[0].node_id, 'n1');
    assert.strictEqual(typeof proof.proof_hash, 'string');
    assert.strictEqual(proof.proof_hash.length > 0, true);
  });

  it('5 — Creazione proposal', () => {
    const snapshot = makeFederationSnapshot(2);
    const proof = buildGovernanceProof(snapshot.snapshot_hash, [
      { node_id: 'n1', snapshot_hash: snapshot.snapshot_hash, timestamp: FIXED_TS },
    ]);
    const proposal = createConsensusProposal(snapshot, proof, FIXED_TS);
    assert.strictEqual(proposal.federation_snapshot_hash, snapshot.snapshot_hash);
    assert.strictEqual(proposal.proof, proof);
    assert.strictEqual(proposal.timestamp, FIXED_TS);
    assert.strictEqual(typeof proposal.proposal_id, 'string');
  });

  it('6 — Creazione consensus context', () => {
    const snapshot = makeFederationSnapshot(1);
    const proof = buildGovernanceProof(snapshot.snapshot_hash, []);
    const proposal = createConsensusProposal(snapshot, proof, FIXED_TS);
    const quorum = computeQuorum(snapshot.graph);
    const ctx = buildConsensusContext(proposal, quorum);
    assert.strictEqual(ctx.proposal, proposal);
    assert.strictEqual(ctx.quorum, quorum);
  });

  it('7 — Determinismo proof hash', () => {
    const atts: GovernanceAttestation[] = [
      { node_id: 'x', snapshot_hash: 'sh', timestamp: FIXED_TS },
    ];
    const p1 = buildGovernanceProof('sh', atts);
    const p2 = buildGovernanceProof('sh', atts);
    assert.strictEqual(p1.proof_hash, p2.proof_hash);
  });

  it('8 — Determinismo proposal', () => {
    const snapshot = makeFederationSnapshot(2);
    const proof = buildGovernanceProof(snapshot.snapshot_hash, [
      { node_id: 'n1', snapshot_hash: snapshot.snapshot_hash, timestamp: FIXED_TS },
    ]);
    const prop1 = createConsensusProposal(snapshot, proof, FIXED_TS);
    const prop2 = createConsensusProposal(snapshot, proof, FIXED_TS);
    assert.strictEqual(prop1.proposal_id, prop2.proposal_id);
  });

  it('9 — Query API funzionante', () => {
    const snapshot = makeFederationSnapshot(2);
    const ctx = prepareConsensusContext(
      snapshot,
      [{ node_id: 'n1', snapshot_hash: snapshot.snapshot_hash, timestamp: FIXED_TS }],
      FIXED_TS
    );
    const proposal = getConsensusProposal(ctx);
    const quorum = getConsensusQuorum(ctx);
    const proof = getGovernanceProof(ctx);
    assert.strictEqual(proposal.proposal_id, ctx.proposal.proposal_id);
    assert.strictEqual(quorum.required_nodes, 2);
    assert.strictEqual(proof.snapshot_hash, snapshot.snapshot_hash);
  });

  it('10 — Stesso input → stesso consensus context', () => {
    const snapshot = makeFederationSnapshot(3);
    const attestations: GovernanceAttestation[] = [
      { node_id: 'a', snapshot_hash: snapshot.snapshot_hash, timestamp: FIXED_TS },
      { node_id: 'b', snapshot_hash: snapshot.snapshot_hash, timestamp: FIXED_TS },
    ];
    const ctx1 = prepareConsensusContext(snapshot, attestations, FIXED_TS);
    const ctx2 = prepareConsensusContext(snapshot, attestations, FIXED_TS);
    assert.strictEqual(ctx1.proposal.proposal_id, ctx2.proposal.proposal_id);
    assert.strictEqual(ctx1.proposal.proof.proof_hash, ctx2.proposal.proof.proof_hash);
    assert.strictEqual(ctx1.quorum.required_nodes, ctx2.quorum.required_nodes);
  });
});
