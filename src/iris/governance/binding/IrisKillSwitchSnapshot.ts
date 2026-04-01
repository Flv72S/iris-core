/**
 * IrisKillSwitchSnapshot — IRIS 10.0.1
 * Snapshot immutabile dello stato dei kill-switch. Completamente Object.freeze.
 */

export interface IrisKillSwitchSnapshotEntry {
  readonly componentId: string;
  readonly enabled: boolean;
}

export interface IrisKillSwitchSnapshot {
  readonly entries: readonly IrisKillSwitchSnapshotEntry[];
  readonly derivedAt: string;
}
