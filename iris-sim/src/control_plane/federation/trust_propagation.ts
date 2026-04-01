import { securityLog } from '../../security/security_logger.js';
import type { DomainCertificate } from './domain_certificate.js';
import { verifyDomainCertificate } from './domain_certificate_verify.js';
import type { InMemoryTrustDistribution } from './trust_distribution.js';
import { InMemoryDomainGovernanceRegistry } from './domain_governance.js';
import type { TrustLifecycleEvent, TrustLifecycleEventType } from './trust_lifecycle_events.js';
import { verifyTrustLifecycleEvent } from './trust_lifecycle_events.js';

export class TrustPropagationEngine {
  private readonly seen = new Set<string>();
  private lastAppliedTimestamp = 0;

  constructor(
    private readonly distribution: InMemoryTrustDistribution,
    private readonly governance: InMemoryDomainGovernanceRegistry,
    private readonly resolveIssuerSecret: (issuerNodeId: string) => string | undefined,
  ) {}

  publish(event: TrustLifecycleEvent): void {
    // No network in this module; publish applies locally and can be wired by callers.
    this.receive(event);
  }

  receive(event: TrustLifecycleEvent): void {
    if (this.seen.has(event.eventId)) return;

    const domainId = event.nodeId;
    const issuerSecret = this.resolveIssuerSecret(event.issuerNodeId);
    if (!issuerSecret) {
      securityLog('TRUST_EVENT_REJECTED_NO_ISSUER_SECRET', { eventType: event.type, domainId });
      throw new Error('TRUST_EVENT_REJECTED_NO_ISSUER_SECRET');
    }
    if (!verifyTrustLifecycleEvent(event, issuerSecret)) {
      securityLog('TRUST_EVENT_SIGNATURE_INVALID', { eventType: event.type, domainId, issuerNodeId: event.issuerNodeId });
      throw new Error('TRUST_EVENT_SIGNATURE_INVALID');
    }

    // Replay-safe freshness: monotonic timestamp.
    if (event.timestamp < this.lastAppliedTimestamp) {
      securityLog('TRUST_EVENT_IGNORED_OLDER', { eventType: event.type, domainId });
      return;
    }

    const authority = this.governance.getAuthority(domainId);
    if (!authority) {
      securityLog('UNAUTHORIZED_LIFECYCLE_EVENT', { eventType: event.type, domainId });
      throw new Error('UNAUTHORIZED_LIFECYCLE_EVENT');
    }

    if (!this.isAuthorityAllowed(authority, event.type as TrustLifecycleEventType)) {
      securityLog('UNAUTHORIZED_LIFECYCLE_EVENT', { eventType: event.type, domainId, authority });
      throw new Error('UNAUTHORIZED_LIFECYCLE_EVENT');
    }

    this.validateDomainConsistency(event);

    // Apply (use event timestamp for deterministic snapshot convergence).
    switch (event.type as TrustLifecycleEventType) {
      case 'DOMAIN_ADDED':
      case 'DOMAIN_RENEWED': {
        const cert = event.payload.domainCertificate as DomainCertificate | undefined;
        if (!cert) throw new Error('TRUST_EVENT_MISSING_DOMAIN_CERTIFICATE');
        verifyDomainCertificate(cert);
        if (cert.domainId !== domainId) {
          securityLog('TRUST_EVENT_DOMAIN_ID_MISMATCH', { eventType: event.type, domainId, certDomainId: cert.domainId });
          throw new Error('TRUST_EVENT_DOMAIN_ID_MISMATCH');
        }
        this.distribution.addTrustedDomain(cert, event.timestamp);
        break;
      }
      case 'DOMAIN_ROTATED': {
        const cert = event.payload.domainCertificate as DomainCertificate | undefined;
        if (!cert) throw new Error('TRUST_EVENT_MISSING_DOMAIN_CERTIFICATE');
        verifyDomainCertificate(cert);

        // Rotation invalidates the original domain certificate: revoke the old domainId.
        this.distribution.revokeDomain(domainId, event.timestamp);
        // Then add the newly issued domain certificate (new derived domainId).
        this.distribution.addTrustedDomain(cert, event.timestamp);
        break;
      }
      case 'DOMAIN_REVOKED': {
        this.distribution.revokeDomain(domainId, event.timestamp);
        break;
      }
      default:
        // Exhaustiveness guard.
        throw new Error(`UNSUPPORTED_TRUST_LIFECYCLE_EVENT:${event.type as string}`);
    }

    this.seen.add(event.eventId);
    this.lastAppliedTimestamp = Math.max(this.lastAppliedTimestamp, event.timestamp);
  }

  private isAuthorityAllowed(authority: { canIssueCertificates: boolean; canRevokeDomains: boolean }, type: TrustLifecycleEventType): boolean {
    switch (type) {
      case 'DOMAIN_ADDED':
      case 'DOMAIN_RENEWED':
      case 'DOMAIN_ROTATED':
        return authority.canIssueCertificates;
      case 'DOMAIN_REVOKED':
        return authority.canRevokeDomains;
      default:
        return false;
    }
  }

  private validateDomainConsistency(event: TrustLifecycleEvent): void {
    const domainId = event.nodeId;
    if (event.type === 'DOMAIN_ADDED' || event.type === 'DOMAIN_RENEWED' || event.type === 'DOMAIN_ROTATED') {
      const cert = event.payload.domainCertificate as DomainCertificate | undefined;
      if (!cert) throw new Error('TRUST_EVENT_MISSING_DOMAIN_CERTIFICATE');
      if (event.type === 'DOMAIN_ADDED' || event.type === 'DOMAIN_RENEWED') {
        if (cert.domainId !== domainId) throw new Error('TRUST_EVENT_DOMAIN_ID_MISMATCH');
      }
    }
  }
}

