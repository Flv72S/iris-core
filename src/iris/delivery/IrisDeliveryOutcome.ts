/**
 * IrisDeliveryOutcome — IRIS 10.1
 * Risultato dichiarativo di un tentativo di delivery. Nessuna decisione, nessun retry.
 */

export type IrisDeliveryStatus = 'attempted' | 'skipped';

export interface IrisDeliveryOutcome {
  readonly adapterId: string;
  readonly channelId: string;
  readonly status: IrisDeliveryStatus;
  readonly derivedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
