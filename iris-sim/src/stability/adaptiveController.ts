/**
 * Stability Layer — Universal wrapper combining rate limiter and hysteresis.
 * wrapNumericDecision(), wrapStateDecision(). No business logic change.
 */

import { AdaptiveRateLimiter } from './rateLimiter.js';
import { HysteresisController } from './hysteresis.js';
import type { RateLimitConfig } from './stabilityTypes.js';
import type { HysteresisConfig } from './stabilityTypes.js';

export interface AdaptiveControllerOptions {
  readonly name: string;
  readonly rateLimitConfig: RateLimitConfig;
  readonly hysteresisConfig?: HysteresisConfig<unknown>;
}

export class AdaptiveController {
  readonly name: string;
  readonly rateLimiter: AdaptiveRateLimiter;
  readonly hysteresis: HysteresisController<unknown> | null;

  private _lastNumericValue: number = 0;

  constructor(options: AdaptiveControllerOptions) {
    this.name = options.name;
    this.rateLimiter = new AdaptiveRateLimiter({
      ...options.rateLimitConfig,
      moduleName: options.name,
    });
    this.hysteresis =
      options.hysteresisConfig != null
        ? new HysteresisController({
            ...options.hysteresisConfig,
            moduleName: options.name,
          })
        : null;
  }

  /**
   * Wrap a numeric decision: rate limit + delta cap + smoothing.
   * Returns stabilized value.
   */
  wrapNumericDecision(newValue: number, nowMs: number = Date.now()): number {
    const out = this.rateLimiter.executeGuarded(this._lastNumericValue, newValue, nowMs);
    this._lastNumericValue = out;
    return out;
  }

  /**
   * Wrap a state decision: hysteresis with upper/lower thresholds.
   * highState and lowState must match the type used in hysteresisConfig.initialState.
   */
  wrapStateDecision(
    inputValue: number,
    highState: unknown,
    lowState: unknown,
    nowMs: number = Date.now(),
  ): unknown {
    if (this.hysteresis == null) return inputValue > 0.5 ? highState : lowState;
    return this.hysteresis.evaluate(inputValue, highState, lowState, nowMs);
  }

  get lastNumericValue(): number {
    return this._lastNumericValue;
  }

  setLastNumericValue(value: number): void {
    this._lastNumericValue = value;
    this.rateLimiter.setLastOutputValue(value);
  }
}
