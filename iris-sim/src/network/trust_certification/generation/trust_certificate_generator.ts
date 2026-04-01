/**
 * Phase 11E — Trust Certificate Generator.
 * Deterministic certificate_hash via stableStringify + SHA-256.
 */

import { createHash } from 'node:crypto';
import type { NodeTrustIndex } from '../../inter_org_trust/types/trust_types.js';
import type { NodeCertificateEligibility } from '../../inter_org_trust/eligibility/trust_certificate_eligibility_types.js';
import type { FederatedTrustCertificate } from '../types/trust_certificate_types.js';
import { classifyTrustCertificate } from '../evaluation/certificate_classification_engine.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/** Payload used for certificate_hash (must match in verifier). */
export function computeCertificateHashPayload(payload: {
  node_id: string;
  organization_id: string;
  trust_index: number;
  trust_level: string;
  certificate_level: string;
  timestamp: number;
}): string {
  return sha256Hex(stableStringify(payload));
}

/**
 * Generate trust certificates for eligible nodes only.
 * Output sorted lexicographically by node_id.
 */
export function generateTrustCertificates(
  trustIndices: readonly NodeTrustIndex[],
  eligibilityResults: readonly NodeCertificateEligibility[],
  timestamp: number
): readonly FederatedTrustCertificate[] {
  const indexByNode = new Map<string, NodeTrustIndex>();
  for (const t of trustIndices) indexByNode.set(t.node_id, t);
  const certs: FederatedTrustCertificate[] = [];
  const sortedEligibility = [...eligibilityResults].sort((a, b) => a.node_id.localeCompare(b.node_id));
  for (const elig of sortedEligibility) {
    const level = classifyTrustCertificate(elig);
    if (level === null) continue;
    const ti = indexByNode.get(elig.node_id);
    if (ti === undefined) continue;
    const payload = {
      node_id: elig.node_id,
      organization_id: elig.organization_id,
      trust_index: ti.trust_index,
      trust_level: ti.trust_level,
      certificate_level: level,
      timestamp,
    };
    const certificate_hash = computeCertificateHashPayload(payload);
    certs.push(
      Object.freeze({
        node_id: elig.node_id,
        organization_id: elig.organization_id,
        trust_index: ti.trust_index,
        trust_level: ti.trust_level,
        certificate_level: level,
        certificate_timestamp: timestamp,
        certificate_hash,
      })
    );
  }
  return certs;
}
