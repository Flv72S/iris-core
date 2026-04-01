/**
 * Stability Layer — Hysteresis Decision Control.
 * Prevents flip-flop: upper/lower thresholds, minStateDuration. No business logic change.
 */

import type { HysteresisConfig } from './stabilityTypes.js';

export interface HysteresisControllerOptions<T> extends HysteresisConfig<T> {
  readonly moduleName?: string;
}

export class HysteresisController<T> {
  readonly upperThreshold: number;
  readonly lowerThreshold: number;
  readonly minStateDurationMs: number;
  readonly moduleName: string;

  private _currentState: T;
  private _lastTransitionTimestamp: number = -1;
  private _hysteresisBlocks: number = 0;

  constructor(options: HysteresisControllerOptions<T>) {
    this.upperThreshold = options.upperThreshold;
    this.lowerThreshold = options.lowerThreshold;
    this._currentState = options.initialState;
    this.minStateDurationMs = Math.max(0, options.minStateDurationMs);
    this.moduleName = options.moduleName ?? 'default';
  }

  get currentState(): T {
    return this._currentState;
  }

  get lastTransitionTimestamp(): number {
    return this._lastTransitionTimestamp;
  }

  get hysteresisBlocks(): number {
    return this._hysteresisBlocks;
  }

  /**
   * Evaluate input: transition to "high" state only if input > upperThreshold,
   * to "low" state only if input < lowerThreshold. Block if minStateDuration not elapsed since last transition.
   */
  evaluate(inputValue: number, highState: T, lowState: T, nowMs: number = Date.now()): T {
    const hasTransitioned = this._lastTransitionTimestamp >= 0;
    const elapsed = hasTransitioned ? nowMs - this._lastTransitionTimestamp : this.minStateDurationMs;
    if (hasTransitioned && elapsed < this.minStateDurationMs) {
      const wouldTransitionUp = inputValue > this.upperThreshold && this._currentState !== highState;
      const wouldTransitionDown = inputValue < this.lowerThreshold && this._currentState !== lowState;
      if (wouldTransitionUp || wouldTransitionDown) {
        this._hysteresisBlocks++;
      }
      return this._currentState;
    }
    if (inputValue > this.upperThreshold) {
      if (this._currentState !== highState) {
        this._currentState = highState;
        this._lastTransitionTimestamp = nowMs;
      }
      return this._currentState;
    }
    if (inputValue < this.lowerThreshold) {
      if (this._currentState !== lowState) {
        this._currentState = lowState;
        this._lastTransitionTimestamp = nowMs;
      }
      return this._currentState;
    }
    return this._currentState;
  }

  /** True if minStateDuration has elapsed since last transition (or never transitioned). */
  canTransition(nowMs: number = Date.now()): boolean {
    if (this._lastTransitionTimestamp < 0) return true;
    return nowMs - this._lastTransitionTimestamp >= this.minStateDurationMs;
  }

  /** Force state (e.g. for reset). Updates lastTransitionTimestamp. */
  forceState(state: T, nowMs: number = Date.now()): void {
    this._currentState = state;
    this._lastTransitionTimestamp = nowMs;
  }
}
