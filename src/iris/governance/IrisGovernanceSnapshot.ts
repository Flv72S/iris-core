/**
 * IrisGovernanceSnapshot — IRIS 10.0
 * Snapshot immutabile dello stato di governance a un istante. Solo osservabile.
 */

import type { IrisGovernanceComponentState } from './IrisGovernanceModel';

export interface IrisGovernanceSnapshot {
  readonly version?: string;
  readonly components: readonly IrisGovernanceComponentState[];
  readonly derivedAt: string;
}
