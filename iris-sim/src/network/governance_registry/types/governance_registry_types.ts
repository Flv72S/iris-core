/**
 * Step 10B — Governance Certificate Registry. Types.
 */

import type { IRISGovernanceCertificate } from '../../../governance/certification_format/types/certificate_types.js';

export interface GovernanceCertificateRecord {
  readonly certificate_id: string;
  readonly certificate: IRISGovernanceCertificate;
  readonly stored_at: number;
}

export interface GovernanceCertificateRegistryState {
  readonly certificates: ReadonlyMap<string, GovernanceCertificateRecord>;
}

export interface GovernanceRegistryIndex {
  readonly byOrganization: ReadonlyMap<string, readonly string[]>;
  readonly byCertificateType: ReadonlyMap<string, readonly string[]>;
}
