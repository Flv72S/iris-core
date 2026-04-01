/**
 * IrisDecisionModel — IRIS 11.0 (skeleton)
 * Tipi dichiarativi per il Decision Plane. Nessuna logica, nessuna nozione operativa.
 */

export interface IrisDecisionModel {
  readonly version?: string;
  readonly entries: readonly IrisDecisionEntry[];
}

export interface IrisDecisionEntry {
  readonly id: string;
  readonly type: string;
  readonly derivedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
