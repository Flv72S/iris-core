/**
 * Microstep 14R — Distribution & Sync Engine. Abstract transport.
 */

import type { DistributionEnvelope } from './distribution_types.js';

export interface DistributionTransport {
  send(envelope: DistributionEnvelope): Promise<void>;
  onReceive(handler: (envelope: DistributionEnvelope) => Promise<void>): void;
}
