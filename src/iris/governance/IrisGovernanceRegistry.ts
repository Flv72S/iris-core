/**
 * IrisGovernanceRegistry — IRIS 10.0
 * Registry read-only per stato dei componenti. Abilitare/disabilitare; nessuna scelta.
 */

export interface IrisGovernanceRegistry {
  isEnabled(componentId: string): boolean;
}
