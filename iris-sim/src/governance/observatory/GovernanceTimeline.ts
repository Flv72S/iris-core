/**
 * Step 7E — Governance Observatory. Timeline storage (in-memory, read-only queries).
 */

import type { GovernanceSnapshot } from './GovernanceSnapshot.js';

export class GovernanceTimeline {
  private readonly _snapshots: GovernanceSnapshot[] = [];

  add(snapshot: GovernanceSnapshot): void {
    this._snapshots.push(snapshot);
  }

  getRange(start: number, end: number): GovernanceSnapshot[] {
    return this._snapshots.filter(
      (s) => s.timestamp >= start && s.timestamp <= end
    );
  }

  latest(): GovernanceSnapshot | null {
    return this._snapshots.length > 0
      ? this._snapshots[this._snapshots.length - 1]!
      : null;
  }

  getAll(): readonly GovernanceSnapshot[] {
    return this._snapshots;
  }

  length(): number {
    return this._snapshots.length;
  }
}
