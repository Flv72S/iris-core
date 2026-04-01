import type { CanonicalIdentityType } from './identity/canonical_identity.js';

export interface PeerInfo {
  nodeId: string;
  publicKey: string;
  /** Canonical identity version advertised by the peer. */
  canonicalIdentity?: CanonicalIdentityType;
  /** Trust domain where the peer belongs. */
  domainId?: string;
  trusted: boolean;
  revoked?: boolean;
}
