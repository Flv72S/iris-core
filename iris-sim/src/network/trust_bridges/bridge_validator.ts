/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Bridge validator.
 */

import type { TrustBridge } from './trust_bridge_interface.js';
import { isValidBridgeType } from './bridge_types.js';

export class BridgeValidator {
  validateBridge(bridge: TrustBridge): boolean {
    if (bridge == null || typeof bridge !== 'object') return false;
    if (typeof bridge.bridge_id !== 'string' || bridge.bridge_id.length === 0) return false;
    if (!isValidBridgeType(bridge.bridge_type)) return false;
    if (typeof bridge.resolveIdentity !== 'function') return false;
    if (typeof bridge.validateInteraction !== 'function') return false;
    return true;
  }
}
