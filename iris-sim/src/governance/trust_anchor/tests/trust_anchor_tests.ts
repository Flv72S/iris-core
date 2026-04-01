/**
 * Step 8J — Governance Trust Anchor tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  IRIS_ROOT_KEY_ID,
  IRIS_ROOT_PUBLIC_KEY_HASH,
} from '../key/iris_root_key.js';
import { signGovernanceObject } from '../sign/governance_signer.js';
import { verifyGovernanceSignature } from '../verify/governance_signature_verifier.js';
import { TRUST_ANCHOR_REGISTRY } from '../registry/trust_anchor_registry.js';

describe('Governance Trust Anchor', () => {
  it('Test 1 — Root key initialization: IRIS_ROOT_KEY_ID and public_key_hash present', () => {
    assert.ok(IRIS_ROOT_KEY_ID);
    assert.ok(IRIS_ROOT_PUBLIC_KEY_HASH);
    assert.strictEqual(TRUST_ANCHOR_REGISTRY.root.key_id, IRIS_ROOT_KEY_ID);
    assert.strictEqual(TRUST_ANCHOR_REGISTRY.root.public_key_hash, IRIS_ROOT_PUBLIC_KEY_HASH);
    assert.strictEqual(IRIS_ROOT_PUBLIC_KEY_HASH.length, 64);
  });

  it('Test 2 — Signature generation: sign simple object, signature.length === 64', () => {
    const obj = { tier: 'TIER_3', score: 0.85 };
    const sig = signGovernanceObject(obj);
    assert.strictEqual(sig.signature.length, 64);
    assert.strictEqual(sig.algorithm, 'IRIS_SHA256_ROOT');
    assert.strictEqual(sig.key_id, IRIS_ROOT_KEY_ID);
  });

  it('Test 3 — Signature verification success: verifyGovernanceSignature === true', () => {
    const obj = { tier: 'TIER_3', score: 0.85 };
    const sig = signGovernanceObject(obj);
    const ok = verifyGovernanceSignature(obj, sig);
    assert.strictEqual(ok, true);
  });

  it('Test 4 — Tampering detection: modify signed object → verify false', () => {
    const obj = { tier: 'TIER_3', score: 0.85 };
    const sig = signGovernanceObject(obj);
    const tampered = { tier: 'TIER_4', score: 0.85 };
    const ok = verifyGovernanceSignature(tampered, sig);
    assert.strictEqual(ok, false);
  });

  it('Test 5 — Determinism: sign same object twice → signature value identical', () => {
    const obj = { tier: 'TIER_2', value: 42 };
    const sig1 = signGovernanceObject(obj);
    const sig2 = signGovernanceObject(obj);
    assert.strictEqual(sig1.signature, sig2.signature);
  });
});
