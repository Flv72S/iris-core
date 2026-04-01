/**
 * IrisKillSwitchBinding — IRIS 10.0.1
 * Associa componentId a lettura read-only dello stato enabled. Nessuna logica, nessuna modifica di stato.
 */

import type { IrisGovernanceRegistry } from '../IrisGovernanceRegistry';

export interface IrisKillSwitchBinding {
  readonly componentId: string;
  readEnabled(registry: IrisGovernanceRegistry): boolean;
}
