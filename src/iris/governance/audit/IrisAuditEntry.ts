/**
 * IrisAuditEntry — IRIS 10.0.2
 * Rappresenta un fatto (presenza/assenza), non un contenuto. Solo dati strutturali.
 */

export type IrisAuditEntryType =
  | 'governance'
  | 'kill-switch'
  | 'interpretation'
  | 'orchestration'
  | 'messaging'
  | 'rendering';

export interface IrisAuditEntry {
  readonly id: string;
  readonly type: IrisAuditEntryType;
  readonly present: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
