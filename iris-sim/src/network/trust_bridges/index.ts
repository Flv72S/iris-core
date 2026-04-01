/**
 * Phase 13XX-H — Cross-Network Trust Bridges.
 */

export type { BridgeType } from './bridge_types.js';
export { isValidBridgeType } from './bridge_types.js';
export type { ExternalIdentity } from './external_identity.js';
export type { TrustBridge } from './trust_bridge_interface.js';
export { BridgeRegistry } from './bridge_registry.js';
export { ExternalNodeAdapter } from './external_node_adapter.js';
export { BridgeValidator } from './bridge_validator.js';
export { TrustBridgeService } from './trust_bridge_service.js';
export { BridgeError, BridgeErrorCode } from './bridge_errors.js';
