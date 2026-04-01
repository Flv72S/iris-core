/**
 * Phase 13XX-H — Cross-Network Trust Bridges. External identity.
 */

import type { BridgeType } from './bridge_types.js';

export interface ExternalIdentity {
  readonly external_id: string;
  readonly provider: string;
  readonly bridge_type: BridgeType;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}
