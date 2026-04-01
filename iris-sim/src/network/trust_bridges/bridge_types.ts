/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Types.
 */

export type BridgeType =
  | 'AI_PROVIDER'
  | 'ENTERPRISE_API'
  | 'IOT_NETWORK'
  | 'EXTERNAL_PROTOCOL';

const BRIDGE_TYPES: readonly BridgeType[] = [
  'AI_PROVIDER',
  'ENTERPRISE_API',
  'IOT_NETWORK',
  'EXTERNAL_PROTOCOL',
];

export function isValidBridgeType(value: string): value is BridgeType {
  return BRIDGE_TYPES.includes(value as BridgeType);
}
