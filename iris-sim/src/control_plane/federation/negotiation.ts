import type { CanonicalIdentityType } from '../identity/canonical_identity.js';
import type { TrustDomain } from '../trust_domain.js';

/**
 * Capability negotiation: pick a canonical identity supported by both sides.
 *
 * Deterministic rule:
 * - iterate local.acceptedCanonicalIdentities in order
 * - pick the first value also present in remote.supportedCanonicalIdentities
 *   (or remote.acceptedCanonicalIdentities when supportedCanonicalIdentities is omitted).
 */
export function negotiateCanonicalIdentity(local: TrustDomain, remote: TrustDomain): CanonicalIdentityType | null {
  const remoteSupported = remote.supportedCanonicalIdentities ?? remote.acceptedCanonicalIdentities;
  for (const id of local.acceptedCanonicalIdentities) {
    if (remoteSupported.includes(id)) return id;
  }
  return null;
}

