/**
 * Stability Layer — Adaptive Rate Limiting.
 * maxActionsPerWindow, maxDeltaPerAction, smoothing, cooldown. No business logic change.
 */

import type { RateLimitConfig } from './stabilityTypes.js';

export interface AdaptiveRateLimiterOptions extends RateLimitConfig {
  readonly moduleName?: string;
}

export class AdaptiveRateLimiter {
  readonly windowSizeMs: number;
  readonly maxActions: number;
  readonly maxDelta: number;
  readonly smoothingAlpha: number;
  readonly moduleName: string;

  private _actionTimestamps: number[] = [];
  private _lastOutputValue: number = 0;
  private _rateLimitViolations: number = 0;
  private _deltaReductions: number = 0;
  private _totalDeltaReduction: number = 0;
  private _smoothingApplications: number = 0;

  constructor(options: AdaptiveRateLimiterOptions) {
    this.windowSizeMs = options.windowSizeMs;
    this.maxActions = options.maxActions;
    this.maxDelta = Math.max(0, options.maxDelta);
    this.smoothingAlpha = Math.max(0, Math.min(1, options.smoothingAlpha));
    this.moduleName = options.moduleName ?? 'default';
  }

  canExecute(nowMs: number = Date.now()): boolean {
    this._pruneOldTimestamps(nowMs);
    return this._actionTimestamps.length < this.maxActions;
  }

  registerExecution(nowMs: number = Date.now()): void {
    this._pruneOldTimestamps(nowMs);
    if (this._actionTimestamps.length >= this.maxActions) {
      this._rateLimitViolations++;
      return;
    }
    this._actionTimestamps.push(nowMs);
  }

  applyDeltaLimit(previousValue: number, newValue: number): number {
    if (this.maxDelta <= 0) return newValue;
    const delta = newValue - previousValue;
    const maxAbsDelta = Math.abs(previousValue) * this.maxDelta;
    if (maxAbsDelta < 1e-10) return newValue;
    if (Math.abs(delta) <= maxAbsDelta) return newValue;
    this._deltaReductions++;
    this._totalDeltaReduction += Math.abs(delta) - maxAbsDelta;
    const sign = delta >= 0 ? 1 : -1;
    return previousValue + sign * maxAbsDelta;
  }

  applySmoothing(previousValue: number, newValue: number): number {
    const smoothed = this.smoothingAlpha * newValue + (1 - this.smoothingAlpha) * previousValue;
    this._smoothingApplications++;
    return smoothed;
  }

  executeGuarded(previousValue: number, newValue: number, nowMs: number = Date.now()): number {
    if (!this.canExecute(nowMs)) {
      this._rateLimitViolations++;
      return this._lastOutputValue;
    }
    const afterDelta = this.applyDeltaLimit(previousValue, newValue);
    const afterSmoothing = this.applySmoothing(this._lastOutputValue, afterDelta);
    this._lastOutputValue = afterSmoothing;
    this.registerExecution(nowMs);
    return afterSmoothing;
  }

  get lastOutputValue(): number {
    return this._lastOutputValue;
  }

  setLastOutputValue(value: number): void {
    this._lastOutputValue = value;
  }

  get rateLimitViolations(): number {
    return this._rateLimitViolations;
  }

  get smoothingApplications(): number {
    return this._smoothingApplications;
  }

  get averageDeltaReduction(): number {
    return this._deltaReductions > 0 ? this._totalDeltaReduction / this._deltaReductions : 0;
  }

  private _pruneOldTimestamps(nowMs: number): void {
    const cutoff = nowMs - this.windowSizeMs;
    this._actionTimestamps = this._actionTimestamps.filter((t) => t > cutoff);
  }
}
