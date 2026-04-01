/**
 * Stability Step 5C — Transition tracker.
 * Tracks envelope state changes, transition frequency, residence time per state. O(1) per observe.
 */

import type { RegimeSnapshot, EnvelopeResidenceStats, TransitionEntry, EnvelopeState } from './dynamicsTypes.js';

function emptyResidence(): EnvelopeResidenceStats {
  return { SAFE: 0, STRESS: 0, CRITICAL: 0 };
}

export class TransitionTracker {
  private _lastState: EnvelopeState | null = null;
  private _lastTimestamp: number = 0;
  private readonly _transitions: TransitionEntry[] = [];
  private _residence: EnvelopeResidenceStats = emptyResidence();

  observe(snapshot: RegimeSnapshot): void {
    const state = snapshot.envelopeState;
    const ts = snapshot.timestamp;

    if (this._lastState !== null) {
      const dt = Math.max(0, ts - this._lastTimestamp);
      this._residence = {
        SAFE: this._residence.SAFE + (this._lastState === 'SAFE' ? dt : 0),
        STRESS: this._residence.STRESS + (this._lastState === 'STRESS' ? dt : 0),
        CRITICAL: this._residence.CRITICAL + (this._lastState === 'CRITICAL' ? dt : 0),
      };
    }
    if (this._lastState !== null && this._lastState !== state) {
      this._transitions.push(
        Object.freeze({ from: this._lastState, to: state, timestamp: ts })
      );
    }

    this._lastState = state;
    this._lastTimestamp = ts;
  }

  getTransitionFrequency(): number {
    if (this._transitions.length === 0) return 0;
    const span = this._lastTimestamp - (this._transitions[0]?.timestamp ?? this._lastTimestamp);
    return span > 0 ? this._transitions.length / (span / 1000) : this._transitions.length;
  }

  getResidenceStats(): EnvelopeResidenceStats {
    return { ...this._residence };
  }

  getTransitionCount(): number {
    return this._transitions.length;
  }
}
