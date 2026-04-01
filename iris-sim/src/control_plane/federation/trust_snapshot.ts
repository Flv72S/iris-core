import type { DomainCertificate } from './domain_certificate.js';
import { sha256 } from '../crypto/hash.js';
import { stableStringify } from '../../security/stable_json.js';

export interface TrustSnapshot {
  version: number;
  timestamp: number;

  domains: DomainCertificate[];
  revokedDomains: string[];

  /**
   * trustGraph[fromDomainId] = list of trusted domainIds.
   * Arrays are treated as sets; canonical ordering is enforced.
   */
  trustGraph: Record<string, string[]>;
}

function normalizeTrustGraph(trustGraph: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const keys = Object.keys(trustGraph).sort();
  for (const k of keys) {
    const arr = trustGraph[k] ?? [];
    const uniq = [...new Set(arr)];
    uniq.sort();
    out[k] = uniq;
  }
  return out;
}

export function normalizeTrustSnapshot(s: TrustSnapshot): TrustSnapshot {
  const domains = [...s.domains].sort((a, b) => a.domainId.localeCompare(b.domainId));
  const revokedDomains = [...new Set(s.revokedDomains ?? [])].sort();
  const trustGraph = normalizeTrustGraph(s.trustGraph ?? {});
  return {
    version: s.version,
    timestamp: s.timestamp,
    domains,
    revokedDomains,
    trustGraph,
  };
}

export function computeTrustSnapshotHash(s: TrustSnapshot): string {
  const normalized = normalizeTrustSnapshot(s);
  return sha256(stableStringify(normalized));
}

