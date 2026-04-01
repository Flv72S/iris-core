/**
 * IrisFeedbackAdapter — IRIS 10.2
 * Boundary puro verso sorgenti di feedback. Nessuna logica, nessuna interpretazione.
 */

import type { IrisFeedbackSignal } from './IrisFeedbackSignal';

export interface IrisFeedbackAdapter {
  readonly id: string;
  readonly source: string;
  collect(): IrisFeedbackSignal[];
}
