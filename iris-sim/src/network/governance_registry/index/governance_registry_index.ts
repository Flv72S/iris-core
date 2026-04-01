/**
 * Step 10B — Governance Certificate Registry. Index builder.
 */

import type {
  GovernanceCertificateRecord,
  GovernanceRegistryIndex,
} from '../types/governance_registry_types.js';

function getOrganizationFromRecord(record: GovernanceCertificateRecord): string {
  const org = record.certificate.audit_metadata['organization'];
  return typeof org === 'string' ? org : '';
}

function getCertificateTypeFromRecord(
  record: GovernanceCertificateRecord
): string {
  return record.certificate.version;
}

/**
 * Build deterministic indexes over certificate records for fast lookup.
 */
export function buildGovernanceRegistryIndex(
  records: GovernanceCertificateRecord[]
): GovernanceRegistryIndex {
  const byOrganization = new Map<string, string[]>();
  const byCertificateType = new Map<string, string[]>();

  const sorted = records
    .slice()
    .sort((a, b) => (a.certificate_id < b.certificate_id ? -1 : a.certificate_id > b.certificate_id ? 1 : 0));

  for (const record of sorted) {
    const id = record.certificate_id;
    const org = getOrganizationFromRecord(record);
    const listOrg = byOrganization.get(org) ?? [];
    listOrg.push(id);
    byOrganization.set(org, listOrg);

    const type = getCertificateTypeFromRecord(record);
    const listType = byCertificateType.get(type) ?? [];
    listType.push(id);
    byCertificateType.set(type, listType);
  }

  return Object.freeze({
    byOrganization: new Map([...byOrganization.entries()].map(([k, v]) => [k, Object.freeze(v)] as const)),
    byCertificateType: new Map([...byCertificateType.entries()].map(([k, v]) => [k, Object.freeze(v)] as const)),
  });
}
