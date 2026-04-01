/**
 * IrisFeedbackSnapshot — IRIS 10.2
 * Collezione osservativa immutabile. Nessuna aggregazione, nessuna metrica.
 */

import type { IrisFeedbackEvent } from './IrisFeedbackEvent';

export interface IrisFeedbackSnapshot {
  readonly events: readonly IrisFeedbackEvent[];
  readonly derivedAt: string;
}
