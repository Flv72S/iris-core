/**
 * IrisFeedbackSignal — IRIS 10.2
 * Fatto osservato da sistemi esterni. Opaco; non interpretato.
 */

export interface IrisFeedbackSignal {
  readonly signalId: string;
  readonly source: string;
  readonly eventType: string;
  readonly deliveryId?: string;
  readonly occurredAt: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}
