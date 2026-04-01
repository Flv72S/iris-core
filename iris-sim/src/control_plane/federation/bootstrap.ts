import { securityLog } from '../../security/security_logger.js';
import type { DomainCertificate } from './domain_certificate.js';
import type { TrustDistribution } from './trust_distribution.js';
import { InMemoryTrustDistribution } from './trust_distribution.js';
import type { TrustSnapshot } from './trust_snapshot.js';

export function bootstrapTrust(input: { snapshot?: TrustSnapshot; seedDomains?: DomainCertificate[] }): TrustDistribution {
  const distribution = new InMemoryTrustDistribution('local');
  try {
    if (input.snapshot) {
      distribution.importTrustSnapshot(input.snapshot);
      return distribution;
    }
    const seed = input.seedDomains ?? [];
    for (const cert of seed) {
      distribution.addTrustedDomain(cert, 0);
    }
    return distribution;
  } catch (e) {
    securityLog('BOOTSTRAP_TRUST_REJECTED', { reason: (e as Error).message });
    throw new Error(`BOOTSTRAP_TRUST_REJECTED: ${(e as Error).message}`);
  }
}

