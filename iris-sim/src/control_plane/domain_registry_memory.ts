import type { DomainRegistry } from './domain_registry.js';
import type { TrustDomain } from './trust_domain.js';

/**
 * Dev/test: in-memory domain registry.
 */
export class InMemoryDomainRegistry implements DomainRegistry {
  private readonly domains = new Map<string, TrustDomain>();
  private readonly revoked = new Map<string, { revokedAt: number; reason?: string }>();

  getDomain(domainId: string): TrustDomain | null {
    return this.domains.get(domainId) ?? null;
  }

  register(domain: TrustDomain): void {
    this.domains.set(domain.domainId, { ...domain });
  }

  isDomainRevoked(domainId: string): boolean {
    return this.revoked.has(domainId);
  }

  // Test helper (not part of the interface).
  revokeDomain(domainId: string, revokedAt = Date.now(), reason?: string): void {
    this.revoked.set(domainId, { revokedAt, ...(reason !== undefined ? { reason } : {}) });
  }
}

