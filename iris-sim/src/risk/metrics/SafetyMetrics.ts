/**
 * S-4 — Safety metrics (per seed).
 */

export interface SafetyMetrics {
  readonly hardViolationCount: number;
  readonly safetyPropertyViolations: number;
  readonly safetyPropertyStatuses: readonly { id: string; status: string }[];
}

export function createSafetyMetrics(
  hardViolationCount: number,
  safetyPropertyViolations: number,
  safetyPropertyStatuses: readonly { id: string; status: string }[],
): SafetyMetrics {
  return Object.freeze({
    hardViolationCount,
    safetyPropertyViolations,
    safetyPropertyStatuses: Object.freeze([...safetyPropertyStatuses]),
  });
}
