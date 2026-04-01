/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Bridge interface.
 */

import type { NodeIdentity } from '../node_identity/index.js';
import type { BridgeType } from './bridge_types.js';
import type { ExternalIdentity } from './external_identity.js';

export interface TrustBridge {
  readonly bridge_id: string;
  readonly bridge_type: BridgeType;
  resolveIdentity(external: ExternalIdentity): NodeIdentity;
  validateInteraction(external: ExternalIdentity, payload: unknown): boolean;
}
