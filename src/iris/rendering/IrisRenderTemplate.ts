/**
 * IrisRenderTemplate — IRIS 9.3
 * Template di rendering per canale. Copy, tone, testo, HTML, markdown ammessi.
 * NON può dedurre decisioni o selezionare "la migliore interpretazione".
 */

import type { IrisMessageEnvelope } from '../messaging';
import type { IrisRenderedContent } from './IrisRenderedContent';

export interface IrisRenderTemplate {
  readonly id: string;
  readonly channelType: string;
  render(input: IrisMessageEnvelope): IrisRenderedContent;
}
