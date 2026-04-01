/**
 * Phase 13XX-H — Cross-Network Trust Bridges. External node adapter.
 */

import type { NodeIdentity } from '../node_identity/index.js';
import type { TrustBridge } from './trust_bridge_interface.js';
import type { ExternalIdentity } from './external_identity.js';

export class ExternalNodeAdapter {
  adapt(external: ExternalIdentity, bridge: TrustBridge): NodeIdentity {
    return bridge.resolveIdentity(external);
  }
}
