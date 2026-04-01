import type { CanonicalIdentityType } from './identity/canonical_identity.js';

export type TrustLevel = 'FULL' | 'PARTIAL' | 'READ_ONLY' | 'PROOF_ONLY';

/**
 * Microstep 16F.X4 — Trust Domains.
 *
 * A trust domain defines:
 * - which canonical identity versions are accepted
 * - which peers/domains are trusted for cross-domain operations
 * - whether cross-domain sync is allowed at all
 */
export interface TrustDomain {
  domainId: string;
  name: string;

  acceptedCanonicalIdentities: CanonicalIdentityType[];
  /**
   * Alias used by 16F.X4.HARDENING capability negotiation.
   * When omitted, it falls back to `acceptedCanonicalIdentities`.
   */
  supportedCanonicalIdentities?: CanonicalIdentityType[];

  trustedPeers: string[]; // nodeIds
  trustedDomains: string[]; // domainIds

  allowCrossDomainSync: boolean;

  /** Fine-grained policy tier. */
  trustLevel: TrustLevel;

  /**
   * Local hard-deny list for domains revoked by this node.
   * The domain registry may also implement revocation independently.
   */
  revokedDomains?: string[];

  /**
   * Cryptographically identifiable domain certificate (16F.X4.HARDENING).
   * When missing, the federation layer falls back to legacy mode with a log.
   */
  domainCertificate?: import('./federation/domain_certificate.js').DomainCertificate;
}

