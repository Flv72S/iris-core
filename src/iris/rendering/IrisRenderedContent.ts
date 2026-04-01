/**
 * IrisRenderedContent — IRIS 9.3
 * Output UX-ready per canale. Copy, tone, HTML, markdown ammessi.
 * Nessuna semantica di decisione; non è "inviato", solo prodotto.
 */

export interface IrisRenderedContent {
  readonly templateId: string;
  readonly channelType: string;
  readonly content: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
