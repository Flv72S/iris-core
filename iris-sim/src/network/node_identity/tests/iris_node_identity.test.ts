/**
 * Step 10A — IRIS Node Identity Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { IRISNodeIdentityInput, IRISNodeIdentity } from '../types/iris_node_identity_types.js';
import { generateIRISNodeIdentity } from '../engine/iris_node_identity_engine.js';
import { computeNodeIdentityHash } from '../hashing/iris_node_identity_hash.js';
import { verifyIRISNodeIdentity } from '../verify/iris_node_identity_verifier.js';

function makeInput(overrides?: Partial<{
  node_name: string;
  organization: string;
  deployment_environment: string;
  geographic_region: string;
  public_key: string;
}>): IRISNodeIdentityInput {
  return {
    metadata: {
      node_name: overrides?.node_name ?? 'node-alpha',
      organization: overrides?.organization ?? 'org-iris',
      deployment_environment: overrides?.deployment_environment ?? 'production',
      ...(overrides?.geographic_region !== undefined && { geographic_region: overrides.geographic_region }),
    },
    public_key: overrides?.public_key ?? 'pk-hex-12345',
  };
}

describe('IRIS Node Identity Engine', () => {
  it('1 — Generazione identità', () => {
    const input = makeInput();
    const identity = generateIRISNodeIdentity(input);
    assert.ok(identity);
    assert.strictEqual(typeof identity.node_id, 'string');
    assert.ok(identity.node_id.startsWith('iris-node-'));
    assert.strictEqual(identity.public_key, 'pk-hex-12345');
    assert.ok(identity.metadata);
    assert.strictEqual(typeof identity.identity_hash, 'string');
    assert.ok(identity.identity_hash.length > 0);
  });

  it('2 — Determinismo Node ID', () => {
    const input = makeInput();
    const a = generateIRISNodeIdentity(input);
    const b = generateIRISNodeIdentity(input);
    assert.strictEqual(a.node_id, b.node_id);
  });

  it('3 — Generazione identity hash', () => {
    const input = makeInput();
    const identity = generateIRISNodeIdentity(input);
    const recomputed = computeNodeIdentityHash(identity);
    assert.strictEqual(identity.identity_hash, recomputed);
  });

  it('4 — Integrità metadata', () => {
    const input = makeInput({
      node_name: 'custom-node',
      organization: 'custom-org',
      deployment_environment: 'staging',
      geographic_region: 'eu-west-1',
    });
    const identity = generateIRISNodeIdentity(input);
    assert.strictEqual(identity.metadata.node_name, 'custom-node');
    assert.strictEqual(identity.metadata.organization, 'custom-org');
    assert.strictEqual(identity.metadata.deployment_environment, 'staging');
    assert.strictEqual(identity.metadata.geographic_region, 'eu-west-1');
  });

  it('5 — Comportamento deterministico', () => {
    const input = makeInput({ public_key: 'same-key' });
    const a = generateIRISNodeIdentity(input);
    const b = generateIRISNodeIdentity(input);
    assert.strictEqual(a.node_id, b.node_id);
    assert.strictEqual(a.identity_hash, b.identity_hash);
    assert.strictEqual(a.public_key, b.public_key);
  });

  it('6 — Verifica positiva', () => {
    const input = makeInput();
    const identity = generateIRISNodeIdentity(input);
    assert.strictEqual(verifyIRISNodeIdentity(input, identity), true);
  });

  it('7 — Rilevazione manomissione', () => {
    const input = makeInput();
    const identity = generateIRISNodeIdentity(input);
    const tampered: IRISNodeIdentity = {
      ...identity,
      identity_hash: identity.identity_hash + 'x',
    };
    assert.strictEqual(verifyIRISNodeIdentity(input, tampered), false);
  });
});
