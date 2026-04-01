/**
 * Phase 11E — Federated Trust Certification. Types.
 * All certificates are immutable.
 */

export type TrustCertificateLevel = 'GOLD' | 'SILVER' | 'BRONZE';

export interface FederatedTrustCertificate {
  readonly node_id: string;
  readonly organization_id: string;
  readonly trust_index: number;
  readonly trust_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED';
  readonly certificate_level: TrustCertificateLevel;
  readonly certificate_timestamp: number;
  readonly certificate_hash: string;
}
