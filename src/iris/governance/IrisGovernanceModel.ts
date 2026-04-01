/**
 * IrisGovernanceModel — IRIS 10.0
 * Modello dichiarativo di configurazione runtime. Solo dati; nessuna decisione.
 */

export interface IrisGovernanceComponentState {
  readonly componentId: string;
  readonly enabled: boolean;
}

export interface IrisGovernanceModel {
  readonly version?: string;
  readonly components: readonly IrisGovernanceComponentState[];
}
