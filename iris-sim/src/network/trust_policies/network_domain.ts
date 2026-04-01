/**
 * Phase 13XX-J — Cross-Network Trust Policies. Network domain.
 */

export type NetworkDomainType =
  | 'IRIS_INTERNAL'
  | 'AI_PROVIDER'
  | 'ENTERPRISE_API'
  | 'IOT_NETWORK'
  | 'EXTERNAL_PROTOCOL';

export interface NetworkDomain {
  readonly domain_id: string;
  readonly domain_type: NetworkDomainType;
  readonly bridge_id?: string | undefined;
}

const DOMAIN_TYPES: readonly NetworkDomainType[] = [
  'IRIS_INTERNAL',
  'AI_PROVIDER',
  'ENTERPRISE_API',
  'IOT_NETWORK',
  'EXTERNAL_PROTOCOL',
];

export function isValidDomainType(value: string): value is NetworkDomainType {
  return DOMAIN_TYPES.includes(value as NetworkDomainType);
}
