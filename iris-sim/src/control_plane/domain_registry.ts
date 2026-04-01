import type { TrustDomain } from './trust_domain.js';

/**
 * Repository of trust domains used by federation enforcement.
 */
export interface DomainRegistry {
  getDomain(domainId: string): TrustDomain | null;
  register(domain: TrustDomain): void;

  /** Local hard-deny list for federation (revocation enforced locally). */
  isDomainRevoked(domainId: string): boolean;
}

