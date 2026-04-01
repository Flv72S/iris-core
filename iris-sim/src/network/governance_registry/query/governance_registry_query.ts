/**
 * Step 10B — Governance Certificate Registry. Query helpers.
 */

import type { GovernanceCertificateRecord } from '../types/governance_registry_types.js';
import type { GovernanceCertificateRegistry } from '../registry/governance_certificate_registry.js';
import { buildGovernanceRegistryIndex } from '../index/governance_registry_index.js';

/**
 * Query certificates by organization (from audit_metadata.organization).
 * Returns records in deterministic order (by certificate_id).
 */
export function queryCertificatesByOrganization(
  registry: GovernanceCertificateRegistry,
  organization: string
): GovernanceCertificateRecord[] {
  const records = registry.listCertificates();
  const index = buildGovernanceRegistryIndex(records);
  const ids = index.byOrganization.get(organization) ?? [];
  const result: GovernanceCertificateRecord[] = [];
  for (const id of ids) {
    const record = registry.getCertificate(id);
    if (record) result.push(record);
  }
  return result;
}

/**
 * Query certificates by type (certificate.version).
 * Returns records in deterministic order (by certificate_id).
 */
export function queryCertificatesByType(
  registry: GovernanceCertificateRegistry,
  certificate_type: string
): GovernanceCertificateRecord[] {
  const records = registry.listCertificates();
  const index = buildGovernanceRegistryIndex(records);
  const ids = index.byCertificateType.get(certificate_type) ?? [];
  const result: GovernanceCertificateRecord[] = [];
  for (const id of ids) {
    const record = registry.getCertificate(id);
    if (record) result.push(record);
  }
  return result;
}
