/**
 * Microstep 16F.X4 — Canonical identity versioning.
 *
 * Canonical identities are used to ensure deterministic cross-domain trust
 * decisions and forward compatibility for future canonicalization schemes.
 */

export type CanonicalIdentityType = 'spki_der_v1';

export interface CanonicalIdentity {
  type: CanonicalIdentityType;
}

export const DEFAULT_CANONICAL_IDENTITY: CanonicalIdentityType = 'spki_der_v1';

