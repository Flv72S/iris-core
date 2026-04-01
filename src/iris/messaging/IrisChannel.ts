/**
 * IrisChannel — IRIS 9.2
 * Descrizione dichiarativa del canale. Nessuna logica di delivery.
 */

export interface IrisChannel {
  readonly id: string;
  readonly type: 'email' | 'push' | 'inbox' | 'webhook' | (string & {});
  readonly metadata?: Readonly<Record<string, unknown>>;
}
