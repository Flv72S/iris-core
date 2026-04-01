/**
 * Step 10B — Governance Certificate Registry. Core registry engine.
 */

import type { IRISGovernanceCertificate } from '../../../governance/certification_format/types/certificate_types.js';
import type { GovernanceCertificateRecord } from '../types/governance_registry_types.js';

export class GovernanceCertificateRegistry {
  private readonly certificates = new Map<string, GovernanceCertificateRecord>();

  constructor() {}

  /**
   * Store a certificate. Uses certificate_hash as certificate_id.
   * If the certificate is already stored, returns the existing record.
   */
  storeCertificate(
    certificate: IRISGovernanceCertificate
  ): GovernanceCertificateRecord {
    const certificate_id = certificate.certificate_hash;
    const existing = this.certificates.get(certificate_id);
    if (existing) return existing;

    const record: GovernanceCertificateRecord = Object.freeze({
      certificate_id,
      certificate,
      stored_at: Date.now(),
    });
    this.certificates.set(certificate_id, record);
    return record;
  }

  /**
   * Retrieve a stored certificate by certificate_id (certificate_hash), or null.
   */
  getCertificate(certificate_id: string): GovernanceCertificateRecord | null {
    return this.certificates.get(certificate_id) ?? null;
  }

  /**
   * List all stored certificates in deterministic order (by certificate_id).
   */
  listCertificates(): GovernanceCertificateRecord[] {
    const list = Array.from(this.certificates.values());
    list.sort((a, b) => (a.certificate_id < b.certificate_id ? -1 : a.certificate_id > b.certificate_id ? 1 : 0));
    return list;
  }
}
