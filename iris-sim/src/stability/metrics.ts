/**
 * Stability Layer — Metrics for S-8. Exposed by controllers/registry.
 */

import type { StabilityMetrics } from './stabilityTypes.js';
import { AdaptiveRateLimiter } from './rateLimiter.js';
import { HysteresisController } from './hysteresis.js';

export function collectRateLimiterMetrics(limiter: AdaptiveRateLimiter): Partial<StabilityMetrics> {
  const windowSec = limiter.windowSizeMs / 1000;
  const actions = limiter.smoothingApplications;
  const effectiveActionFrequency = windowSec > 0 && actions > 0 ? actions / windowSec : 0;
  return {
    rateLimitViolations: limiter.rateLimitViolations,
    averageDeltaReduction: limiter.averageDeltaReduction,
    smoothingApplications: limiter.smoothingApplications,
    effectiveActionFrequency,
  };
}

export function collectHysteresisMetrics(controller: HysteresisController<unknown>): Partial<StabilityMetrics> {
  return {
    hysteresisBlocks: controller.hysteresisBlocks,
  };
}

export function mergeStabilityMetrics(partials: Partial<StabilityMetrics>[]): StabilityMetrics {
  let rateLimitViolations = 0;
  let totalDeltaReduction = 0;
  let deltaReductionCount = 0;
  let hysteresisBlocks = 0;
  let smoothingApplications = 0;
  let effectiveActionFrequency = 0;
  for (const p of partials) {
    if (p.rateLimitViolations != null) rateLimitViolations += p.rateLimitViolations;
    if (p.averageDeltaReduction != null && p.averageDeltaReduction > 0) {
      totalDeltaReduction += p.averageDeltaReduction;
      deltaReductionCount++;
    }
    if (p.hysteresisBlocks != null) hysteresisBlocks += p.hysteresisBlocks;
    if (p.smoothingApplications != null) smoothingApplications += p.smoothingApplications;
    if (p.effectiveActionFrequency != null) effectiveActionFrequency += p.effectiveActionFrequency;
  }
  return {
    rateLimitViolations,
    averageDeltaReduction: deltaReductionCount > 0 ? totalDeltaReduction / deltaReductionCount : 0,
    hysteresisBlocks,
    smoothingApplications,
    effectiveActionFrequency,
  };
}
