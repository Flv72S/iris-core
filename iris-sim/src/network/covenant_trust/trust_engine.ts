/**
 * Microstep 14S — Trust & Verification Layer. Trust engine.
 * Validation MUST be deterministic and precede persistence.
 */

import type { TrustVerifier } from './trust_verifier.js';
import type { SignedRecordEnvelope } from './trust_types.js';
import type { TrustRegistry } from './trust_registry.js';
import type { FederationRegistry } from './trust_federation.js';
import type { AuthorityRegistry } from './trust_authority.js';
import type { ReplayProtection } from './trust_replay.js';

export enum TrustErrorCode {
  UNKNOWN_NODE = 'UNKNOWN_NODE',
  PUBLIC_KEY_MISMATCH = 'PUBLIC_KEY_MISMATCH',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_ENVELOPE = 'INVALID_ENVELOPE',
  NOT_IN_FEDERATION = 'NOT_IN_FEDERATION',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_REVOKED = 'KEY_REVOKED',
  UNTRUSTED_AUTHORITY = 'UNTRUSTED_AUTHORITY',
  REPLAY_DETECTED = 'REPLAY_DETECTED',
}

export class TrustError extends Error {
  constructor(
    public readonly code: TrustErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TrustError';
    Object.setPrototypeOf(this, TrustError.prototype);
  }
}

export class TrustEngine {
  constructor(
    private readonly verifier: TrustVerifier,
    private readonly registry: TrustRegistry,
    private readonly federation: FederationRegistry,
    private readonly authorities: AuthorityRegistry,
    private readonly replay: ReplayProtection,
  ) {}

  validate(envelope: SignedRecordEnvelope): void {
    if (!envelope || typeof envelope.node_id !== 'string' || envelope.node_id.trim().length === 0) {
      throw new TrustError(TrustErrorCode.INVALID_ENVELOPE, 'Missing node_id');
    }
    // 2) federation membership
    if (!this.federation.isMember(envelope.node_id)) {
      throw new TrustError(TrustErrorCode.NOT_IN_FEDERATION, `Node not in federation: ${envelope.node_id}`);
    }
    // 3) authority linkage (if member has authority_id)
    const member = this.federation.getMember(envelope.node_id);
    if (member?.authority_id) {
      if (!this.authorities.isTrustedAuthority(member.authority_id)) {
        throw new TrustError(TrustErrorCode.UNTRUSTED_AUTHORITY, `Untrusted authority: ${member.authority_id}`);
      }
    }
    // 4) key lookup and revocation check
    const key_id = envelope.key_id ?? 'legacy';
    const key = this.registry.getKey(envelope.node_id, key_id) ?? this.registry.getActiveKey(envelope.node_id);
    if (!key) {
      throw new TrustError(TrustErrorCode.KEY_NOT_FOUND, `Key not found: ${envelope.node_id}:${key_id}`);
    }
    const effectivePublicKey = envelope.public_key ?? key.public_key;
    if (envelope.public_key != null && key.public_key !== envelope.public_key) {
      throw new TrustError(TrustErrorCode.PUBLIC_KEY_MISMATCH, `Public key mismatch for node_id: ${envelope.node_id}`);
    }
    // revoked keys invalidate future signatures; historical signatures remain valid
    if (key.revoked) {
      const revokedAt = key.revoked_at ?? Number.POSITIVE_INFINITY;
      if (envelope.signed_at >= revokedAt) {
        throw new TrustError(TrustErrorCode.KEY_REVOKED, `Key revoked: ${envelope.node_id}:${key.key_id}`);
      }
    }
    // extended scope: record_hash must match
    if (envelope.record_hash) {
      // verifier recomputes anyway; we keep record_hash for replay tuple and explicit integrity scope
    }
    const envelopeWithKey: SignedRecordEnvelope = {
      ...envelope,
      public_key: effectivePublicKey,
      key_id: envelope.key_id ?? key.key_id,
    };

    const ok = this.verifier.verify(envelopeWithKey);
    if (!ok) {
      throw new TrustError(TrustErrorCode.INVALID_SIGNATURE, 'Invalid signature');
    }
    const computedRecordHash = this.verifier.computeRecordHash(envelopeWithKey.record);
    const effectiveRecordHash = envelope.record_hash ?? computedRecordHash;
    if (envelope.record_hash && envelope.record_hash !== computedRecordHash) {
      throw new TrustError(TrustErrorCode.INVALID_SIGNATURE, 'Record hash mismatch');
    }
    // 7) replay protection
    const replayView: SignedRecordEnvelope = {
      ...envelopeWithKey,
      record_hash: effectiveRecordHash,
    };
    if (this.replay.isReplay(replayView)) {
      throw new TrustError(TrustErrorCode.REPLAY_DETECTED, 'Replay detected');
    }
    // 8) register
    this.replay.register(replayView);
  }
}

