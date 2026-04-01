/**
 * Microstep 14R — Distribution & Sync Engine. Types.
 */

import type { SignedRecordEnvelope } from '../covenant_trust/index.js';

export interface DistributionEnvelope {
  readonly node_id: string;
  readonly records: readonly SignedRecordEnvelope[];
  readonly timestamp: number;
}
