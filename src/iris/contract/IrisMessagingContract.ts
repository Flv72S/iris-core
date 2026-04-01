/**
 * IrisMessagingContract — IRIS 12.2
 * Contratto dichiarativo: cosa un sistema esterno potrebbe inviare, non come né quando.
 * MUST NOT: send, deliver, channelId, adapterId.
 */

import type { IrisActionIntentType } from '../action-bridge';

export interface IrisMessagingContract {
  readonly contractId: string;
  readonly intentId: string;
  readonly intentType: IrisActionIntentType;
  readonly messagePurpose: string;
  readonly payloadSchema?: Readonly<Record<string, unknown>>;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
