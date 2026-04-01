/**
 * IrisDeliveryAdapter — IRIS 10.1
 * Boundary verso sistemi esterni. Adatta contenuti; non conosce IRIS internals.
 */

import type { IrisRenderedContent } from '../rendering';
import type { IrisDeliveryOutcome } from './IrisDeliveryOutcome';

export interface IrisDeliveryAdapter {
  readonly id: string;
  readonly channelType: string;
  deliver(renderedContent: IrisRenderedContent): IrisDeliveryOutcome;
}
