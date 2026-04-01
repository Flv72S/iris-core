/**
 * S-1 — Actor (Byzantine) type definitions.
 */

import type { SimulatedMessage } from '../node/NodeTypes.js';

export type ByzantineBehaviorType =
  | 'duplicate'
  | 'delay'
  | 'mutate'
  | 'drop'
  | 'silent_fail';

export interface ByzantineAction {
  readonly type: ByzantineBehaviorType;
  readonly message?: SimulatedMessage;
  readonly mutatedPayload?: unknown;
}
