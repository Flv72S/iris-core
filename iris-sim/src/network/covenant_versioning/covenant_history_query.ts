/**
 * Microstep 14P — Versioning & Immutable History. Query layer.
 */

import type { CovenantHistoryEngine } from './covenant_history_engine.js';
import type { CovenantVersion } from './covenant_versioning_types.js';

export class CovenantHistoryQuery {
  constructor(private readonly historyEngine: CovenantHistoryEngine) {}

  getVersion(covenant_id: string, version: number): CovenantVersion | null {
    const history = this.historyEngine.getHistory(covenant_id);
    return history.find((v) => v.version === version) ?? null;
  }

  getLatest(covenant_id: string): CovenantVersion | null {
    const history = this.historyEngine.getHistory(covenant_id);
    if (history.length === 0) return null;
    return history[history.length - 1]!;
  }

  getAllLatest(): Map<string, CovenantVersion> {
    const ids = this.historyEngine.getCovenantIds();
    const map = new Map<string, CovenantVersion>();
    for (const id of ids) {
      const latest = this.getLatest(id);
      if (latest) map.set(id, latest);
    }
    return map;
  }
}
