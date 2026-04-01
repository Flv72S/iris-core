import type { TrustAuditRecord } from './audit_types.js';
import type { MerkleProof } from './merkle_types.js';

import type { CanonicalIdentityType } from './identity/canonical_identity.js';

import type { DomainCertificate } from './federation/domain_certificate.js';

export interface RootAnnouncement {
  nodeId: string;
  merkleRoot: string;
  totalRecords: number;
  timestamp: number;
  signature: string;
  /** Ed25519 SPKI PEM; omit for legacy HMAC-only envelopes. */
  signerPublicKey?: string;
  /** Canonical identity version advertised by sender (omit for legacy). */
  canonicalIdentity?: CanonicalIdentityType;
  /** Capability negotiation: supported canonical identities. */
  supportedCanonicalIdentities?: CanonicalIdentityType[];
  /** 16F.X4.HARDENING: cryptographically verifiable domain certificate. */
  domainCertificate?: DomainCertificate;
  /** Trust domain where sender belongs (omit for legacy; treated as local domain). */
  domainId?: string;
}

export interface ProofRequest {
  requesterNodeId: string;
  targetNodeId: string;
  recordIndex: number;
  expectedRoot: string;
  timestamp: number;
  signature: string;
  signerPublicKey?: string;
  canonicalIdentity?: CanonicalIdentityType;
  supportedCanonicalIdentities?: CanonicalIdentityType[];
  domainCertificate?: DomainCertificate;
  domainId?: string;
}

export interface ProofResponse {
  responderNodeId: string;
  proof: MerkleProof;
  record: TrustAuditRecord;
  timestamp: number;
  signature: string;
  signerPublicKey?: string;
  canonicalIdentity?: CanonicalIdentityType;
  supportedCanonicalIdentities?: CanonicalIdentityType[];
  domainCertificate?: DomainCertificate;
  domainId?: string;
}

export interface SyncState {
  nodeId: string;
  lastKnownRoot: string;
  lastSyncTimestamp: number;
  divergenceDetected: boolean;
}
