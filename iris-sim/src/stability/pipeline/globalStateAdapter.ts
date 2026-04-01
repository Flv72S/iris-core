/**
 * Stability Step 4 — Simulated global state adapter.
 * Apply commits only from commitRequest; no access to real system global state.
 */

import type { CommitRequest } from '../sandbox/sandboxTypes.js';
import type { GlobalStateSnapshot, CommitApplicationRecord } from './pipelineTypes.js';

export class GlobalStateAdapter {
  private readonly _internalState: Record<string, unknown> = {};
  private readonly _history: CommitApplicationRecord[] = [];

  getSnapshot(): GlobalStateSnapshot {
    return Object.freeze({ ...this._internalState });
  }

  applyCommit(moduleName: string, commitRequest: CommitRequest, impactScore: number): void {
    this._internalState[commitRequest.localKey] = commitRequest.value;
    const record: CommitApplicationRecord = {
      moduleName,
      applied: true,
      impactScore,
      timestamp: commitRequest.timestamp,
    };
    this._history.push(record);
  }

  getHistory(): readonly CommitApplicationRecord[] {
    return this._history;
  }

  getState(): Record<string, unknown> {
    return this._internalState;
  }
}
