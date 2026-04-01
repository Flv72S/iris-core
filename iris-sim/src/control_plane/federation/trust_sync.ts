import type { TrustSnapshot } from './trust_snapshot.js';
import {
  computeTrustSnapshotHash,
  normalizeTrustSnapshot,
} from './trust_snapshot.js';
import type { InMemoryTrustDistribution } from './trust_distribution.js';
import { securityLog } from '../../security/security_logger.js';
import type { DomainCertificate } from './domain_certificate.js';

function mergeTrustGraph(local: Record<string, string[]>, remote: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = { ...local };
  for (const [k, arr] of Object.entries(remote)) {
    const cur = out[k] ?? [];
    out[k] = [...new Set([...cur, ...arr])].sort();
  }
  // ensure deterministic key ordering via normalize later
  return out;
}

export class FederationTrustSyncEngine {
  constructor(private readonly distribution: InMemoryTrustDistribution) {}

  getLocalSnapshot(): TrustSnapshot {
    return this.distribution.exportTrustSnapshot();
  }

  syncTrustState(remoteSnapshot: TrustSnapshot): void {
    const local = normalizeTrustSnapshot(this.distribution.exportTrustSnapshot());
    const remote = normalizeTrustSnapshot(remoteSnapshot);

    const localHash = computeTrustSnapshotHash(local);
    const remoteHash = computeTrustSnapshotHash(remote);
    if (localHash === remoteHash) return;

    // strictest enforcement: if either side says revoked => revoked.
    const revoked = new Set<string>([...local.revokedDomains, ...remote.revokedDomains].sort());

    const localDomains = new Map<string, DomainCertificate>(local.domains.map((d) => [d.domainId, d]));
    const remoteDomains = new Map<string, DomainCertificate>(remote.domains.map((d) => [d.domainId, d]));

    for (const [domainId, cert] of remoteDomains) {
      if (revoked.has(domainId)) continue;
      const cur = localDomains.get(domainId);
      if (!cur) {
        // take remote
        this.distribution.addTrustedDomain(cert, remote.timestamp);
        continue;
      }
      // conflict resolution: latest issuedAt wins deterministically
      if (typeof cert.issuedAt === 'number' && cert.issuedAt > cur.issuedAt) {
        this.distribution.removeTrustedDomain(domainId, remote.timestamp);
        this.distribution.addTrustedDomain(cert, remote.timestamp);
      } else if (typeof cert.issuedAt === 'number' && cert.issuedAt < cur.issuedAt) {
        // ignore remote
      } else if (cert.domainPublicKey !== cur.domainPublicKey || cert.signature !== cur.signature) {
        securityLog('TRUST_SYNC_CONFLICT', { domainId, localIssuedAt: cur.issuedAt, remoteIssuedAt: cert.issuedAt });
      }
    }

    // Revoke domains that became revoked due to remote.
    for (const rid of revoked) {
      if (!local.revokedDomains.includes(rid)) {
        this.distribution.revokeDomain(rid, remote.timestamp);
      }
    }

    // Merge trust graph.
    const mergedGraph = mergeTrustGraph(local.trustGraph, remote.trustGraph);

    // Import a deterministic merged snapshot with timestamp = max(local, remote).
    const mergedSnapshot: TrustSnapshot = {
      version: Math.max(local.version, remote.version),
      timestamp: Math.max(local.timestamp, remote.timestamp),
      domains: this.distribution.getTrustedDomains(),
      revokedDomains: [...revoked].sort(),
      trustGraph: mergedGraph,
    };
    this.distribution.importTrustSnapshot(mergedSnapshot);
  }
}

