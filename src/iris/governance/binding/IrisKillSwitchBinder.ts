/**
 * IrisKillSwitchBinder — IRIS 10.0.1
 * Legge lo stato dai kill-switch via registry e bindings. Puro, deterministico, side-effect free.
 * Governance osserva; non decide.
 */

import type { IrisGovernanceRegistry } from '../IrisGovernanceRegistry';
import type { IrisKillSwitchBinding } from './IrisKillSwitchBinding';
import type { IrisKillSwitchSnapshot, IrisKillSwitchSnapshotEntry } from './IrisKillSwitchSnapshot';

export class IrisKillSwitchBinder {
  /**
   * Produce snapshot frozen dello stato enabled per ogni binding. Solo lettura.
   */
  snapshot(
    registry: IrisGovernanceRegistry,
    bindings: readonly IrisKillSwitchBinding[]
  ): IrisKillSwitchSnapshot {
    const entries: IrisKillSwitchSnapshotEntry[] = bindings.map((b) =>
      Object.freeze({
        componentId: b.componentId,
        enabled: b.readEnabled(registry),
      })
    );
    return Object.freeze({
      entries: Object.freeze(entries),
      derivedAt: new Date().toISOString(),
    });
  }
}
