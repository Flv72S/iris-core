/**
 * IrisGovernanceEngine — IRIS 10.0 (skeleton)
 * Wiring dichiarativo: da modello a snapshot frozen. Nessuna logica, nessuna decisione.
 */

import type { IrisGovernanceModel } from './IrisGovernanceModel';
import type { IrisGovernanceSnapshot } from './IrisGovernanceSnapshot';

export class IrisGovernanceEngine {
  constructor(private readonly model: IrisGovernanceModel) {}

  /**
   * Produce uno snapshot frozen dello stato di governance. Solo wiring; nessuna esecuzione.
   */
  getSnapshot(): IrisGovernanceSnapshot {
    const components = Object.freeze([...this.model.components.map((c) => Object.freeze({ ...c }))]);
    return Object.freeze({
      version: this.model.version,
      components,
      derivedAt: new Date().toISOString(),
    });
  }
}
