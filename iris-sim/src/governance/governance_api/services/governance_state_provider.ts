/**
 * Step 8A — Read-only state provider for Governance Public API.
 * Supplies current tier snapshot, certificate, and history. Updated by governance runtime, not by API.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { GovernanceCertification } from '../../certification/certification.js';

export interface GovernanceHistoryEntry {
  readonly snapshot_id: string;
  readonly tier: string;
  readonly sla_profile: string;
  readonly governance_hash: string;
  readonly timestamp: number;
}

/**
 * Read-only view of current governance state. API uses this; something else populates it.
 */
export interface IGovernanceStateProvider {
  getCurrentTierSnapshot(): GovernanceTierSnapshot | null;
  getCurrentCert(): GovernanceCertification | null;
  getHistory(limit: number, fromTimestamp?: number): readonly GovernanceHistoryEntry[];
}

/**
 * Default in-memory state provider. Mutable setters are for the governance runtime; API only reads.
 */
export class DefaultGovernanceStateProvider implements IGovernanceStateProvider {
  private _tierSnapshot: GovernanceTierSnapshot | null = null;
  private _cert: GovernanceCertification | null = null;
  private readonly _history: GovernanceHistoryEntry[] = [];

  getCurrentTierSnapshot(): GovernanceTierSnapshot | null {
    return this._tierSnapshot;
  }

  getCurrentCert(): GovernanceCertification | null {
    return this._cert;
  }

  getHistory(limit: number, fromTimestamp?: number): readonly GovernanceHistoryEntry[] {
    let list = this._history;
    if (fromTimestamp !== undefined) {
      list = list.filter((e) => e.timestamp >= fromTimestamp);
    }
    return list.slice(-limit);
  }

  setCurrentTierSnapshot(snap: GovernanceTierSnapshot | null): void {
    this._tierSnapshot = snap;
  }

  setCurrentCert(cert: GovernanceCertification | null): void {
    this._cert = cert;
  }

  appendHistory(entry: GovernanceHistoryEntry): void {
    this._history.push(entry);
  }
}
