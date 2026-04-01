import type { DomainCertificate } from './domain_certificate.js';
import { verifyDomainCertificate } from './domain_certificate_verify.js';
import type { TrustSnapshot } from './trust_snapshot.js';
import { normalizeTrustSnapshot } from './trust_snapshot.js';

export interface TrustDistribution {
  addTrustedDomain(cert: DomainCertificate): void;
  removeTrustedDomain(domainId: string): void;
  getTrustedDomains(): DomainCertificate[];

  importTrustSnapshot(snapshot: TrustSnapshot): void;
  exportTrustSnapshot(): TrustSnapshot;
}

export class InMemoryTrustDistribution implements TrustDistribution {
  private version = 1;
  private timestamp = Date.now();

  private readonly domains = new Map<string, DomainCertificate>();
  private readonly revoked = new Set<string>();

  // trustGraph[fromDomain] = trusted domains list
  private trustGraph: Record<string, string[]> = {};

  constructor(private readonly localDomainId: string, initialTrustGraph?: Record<string, string[]>) {
    this.trustGraph = initialTrustGraph ?? {};
    if (!this.trustGraph[this.localDomainId]) this.trustGraph[this.localDomainId] = [];
  }

  addTrustedDomain(cert: DomainCertificate, atTimestamp?: number): void {
    verifyDomainCertificate(cert);
    if (this.revoked.has(cert.domainId)) {
      // hard deny: do not add revoked domain as trusted
      this.removeTrustedDomain(cert.domainId);
      return;
    }
    this.domains.set(cert.domainId, cert);
    const list = this.trustGraph[this.localDomainId] ?? [];
    if (!list.includes(cert.domainId)) {
      this.trustGraph[this.localDomainId] = [...list, cert.domainId].sort();
    }
    this.touch(atTimestamp);
  }

  removeTrustedDomain(domainId: string, atTimestamp?: number): void {
    this.domains.delete(domainId);
    for (const from of Object.keys(this.trustGraph)) {
      const cur = this.trustGraph[from] ?? [];
      const next = cur.filter((d) => d !== domainId);
      if (next.length !== cur.length) this.trustGraph[from] = next.sort();
    }
    this.touch(atTimestamp);
  }

  revokeDomain(domainId: string, atTimestamp?: number): void {
    this.revoked.add(domainId);
    this.removeTrustedDomain(domainId, atTimestamp);
    this.touch(atTimestamp);
  }

  isDomainRevoked(domainId: string): boolean {
    return this.revoked.has(domainId);
  }

  getTrustedDomains(): DomainCertificate[] {
    return [...this.domains.values()].sort((a, b) => a.domainId.localeCompare(b.domainId));
  }

  importTrustSnapshot(snapshot: TrustSnapshot): void {
    const normalized = normalizeTrustSnapshot(snapshot);
    this.version = normalized.version;
    this.timestamp = normalized.timestamp;
    this.domains.clear();
    this.revoked.clear();
    this.trustGraph = normalized.trustGraph;

    for (const rid of normalized.revokedDomains) {
      this.revoked.add(rid);
    }
    for (const cert of normalized.domains) {
      if (this.revoked.has(cert.domainId)) continue;
      verifyDomainCertificate(cert);
      this.domains.set(cert.domainId, cert);
    }
  }

  exportTrustSnapshot(): TrustSnapshot {
    return {
      version: this.version,
      timestamp: this.timestamp,
      domains: this.getTrustedDomains(),
      revokedDomains: [...this.revoked.values()].sort(),
      trustGraph: this.trustGraph,
    };
  }

  private touch(atTimestamp?: number): void {
    if (typeof atTimestamp === 'number' && Number.isFinite(atTimestamp)) this.timestamp = atTimestamp;
    else this.timestamp = Date.now();
  }
}

