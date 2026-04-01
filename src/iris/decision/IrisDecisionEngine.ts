/**
 * IrisDecisionEngine — IRIS 11.0 (skeleton)
 * Wiring dichiarativo: da modello a snapshot frozen. Nessuna logica decisionale implementata.
 */

import type { IrisDecisionModel } from './IrisDecisionModel';
import type { IrisDecisionSnapshot } from './IrisDecisionSnapshot';
import type { DecisionRegistry } from './IrisDecisionKillSwitch';
import { isDecisionEnabled } from './IrisDecisionKillSwitch';

export class IrisDecisionEngine {
  constructor(private readonly model: IrisDecisionModel) {}

  /**
   * Restituisce snapshot frozen. Se kill-switch OFF restituisce snapshot con entries [].
   * Nessuna logica decisionale; solo wiring.
   */
  getSnapshot(registry: DecisionRegistry): IrisDecisionSnapshot {
    const derivedAt = new Date().toISOString();
    if (!isDecisionEnabled(registry)) {
      return Object.freeze({
        entries: Object.freeze([]),
        derivedAt,
      });
    }
    const entries = Object.freeze(
      this.model.entries.map((e) =>
        Object.freeze({
          id: e.id,
          type: e.type,
          derivedAt: e.derivedAt,
          ...(e.metadata != null && { metadata: Object.freeze({ ...e.metadata }) }),
        })
      )
    );
    return Object.freeze({
      entries,
      derivedAt,
    });
  }
}
