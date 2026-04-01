/**
 * IrisFeedbackEvent — IRIS 10.2
 * Evento normalizzato interno. Segnale + derivedAt; nessuna interpretazione.
 */

import type { IrisFeedbackSignal } from './IrisFeedbackSignal';

export interface IrisFeedbackEvent {
  readonly eventId: string;
  readonly signal: IrisFeedbackSignal;
  readonly derivedAt: string;
}
