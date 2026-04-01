/**
 * IrisRenderResult — IRIS 9.3
 * Risultato di rendering per un canale. Più contenuti ammessi.
 * Nessun "primary", "final", "best".
 */

import type { IrisRenderedContent } from './IrisRenderedContent';

export interface IrisRenderResult {
  readonly channelId: string;
  readonly renderedContents: readonly IrisRenderedContent[];
  readonly derivedAt: string;
}
