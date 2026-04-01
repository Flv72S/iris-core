/**
 * Stability Layer — Type definitions for adaptive rate limiting and hysteresis.
 * Structural damping only; no business logic.
 */

export interface RateLimitConfig {
  readonly windowSizeMs: number;
  readonly maxActions: number;
  readonly maxDelta: number;
  readonly smoothingAlpha: number;
}

export interface HysteresisConfig<T> {
  readonly upperThreshold: number;
  readonly lowerThreshold: number;
  readonly initialState: T;
  readonly minStateDurationMs: number;
}

export interface AdaptiveModuleRegistration {
  readonly name: string;
  readonly rateLimitConfig: RateLimitConfig;
  readonly hysteresisConfig?: HysteresisConfig<unknown>;
}

export interface StabilityMetrics {
  readonly rateLimitViolations: number;
  readonly averageDeltaReduction: number;
  readonly hysteresisBlocks: number;
  readonly smoothingApplications: number;
  readonly effectiveActionFrequency: number;
}

export interface StabilityDiagnosticLog {
  logRateLimitHit(moduleName: string, timestamp: number): void;
  logHysteresisBlock(moduleName: string, fromState: string, timestamp: number): void;
  logDeltaReduction(moduleName: string, originalDelta: number, cappedDelta: number): void;
  logSmoothingApplied(moduleName: string, previous: number, raw: number, smoothed: number): void;
}
