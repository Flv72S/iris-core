/**
 * IrisMessageBinding — IRIS 9.2
 * Associazione dichiarativa canale ↔ envelope.
 */

import type { IrisChannel } from './IrisChannel';
import type { IrisMessageEnvelope } from './IrisMessageEnvelope';

export interface IrisMessageBinding {
  readonly channel: IrisChannel;
  readonly envelope: IrisMessageEnvelope;
}
