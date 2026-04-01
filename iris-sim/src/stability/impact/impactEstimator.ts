/**
 * Stability Step 5B — Proportional impact estimator.
 * When previousState is provided: impact by delta/ref; when not: legacy structural formula.
 * Backward compatible: same public signature, optional previousState.
 */

import type { ImpactEstimate } from '../validator/stabilityBudgetTypes.js';
import type { CommitRequest } from '../sandbox/sandboxTypes.js';

const MAX_IMPACT_PER_KEY = 1.0;
const MAX_TOTAL_IMPACT = 5.0;
const MULTI_KEY_FACTOR = 1.1;

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getOldValue(
  previousState: Readonly<Record<string, unknown>>,
  localKey: string,
  subKey?: string
): number | undefined {
  const parent = previousState[localKey];
  if (subKey !== undefined && isPlainObject(parent)) {
    if (!(subKey in parent)) return undefined;
    const v = parent[subKey];
    return isNumeric(v) ? v : undefined;
  }
  if (!(localKey in previousState)) return undefined;
  const v = parent;
  return isNumeric(v) ? v : undefined;
}

/**
 * Proportional impact: delta / referenceValue, clamp 1 per key; sum; multi-key * 1.1; clamp 5.
 */
function computeProportionalImpact(
  commitRequest: CommitRequest,
  previousState: Readonly<Record<string, unknown>>
): number {
  const value = commitRequest.value;
  const localKey = commitRequest.localKey;
  let totalImpact = 0;
  const keys: string[] = [];

  if (isNumeric(value)) {
    const oldVal = getOldValue(previousState, localKey);
    if (oldVal === undefined) {
      totalImpact += MAX_IMPACT_PER_KEY;
    } else {
      const newVal = value;
      const delta = Math.abs(newVal - oldVal);
      const base = Math.abs(oldVal) > 0 ? Math.abs(oldVal) : 1;
      totalImpact += Math.min(MAX_IMPACT_PER_KEY, delta / base);
    }
    keys.push(localKey);
  } else if (isPlainObject(value)) {
    const parent = previousState[localKey];
    const parentExists = isPlainObject(parent);
    for (const k of Object.keys(value)) {
      keys.push(k);
      const newVal = value[k];
      const oldVal = parentExists ? getOldValue(previousState, localKey, k) : undefined;
      if (oldVal === undefined) {
        totalImpact += MAX_IMPACT_PER_KEY;
      } else if (isNumeric(newVal)) {
        const delta = Math.abs(newVal - oldVal);
        const base = Math.abs(oldVal) > 0 ? Math.abs(oldVal) : 1;
        totalImpact += Math.min(MAX_IMPACT_PER_KEY, delta / base);
      } else {
        totalImpact += MAX_IMPACT_PER_KEY;
      }
    }
  } else {
    totalImpact += MAX_IMPACT_PER_KEY;
    keys.push(localKey);
  }

  if (keys.length > 1) {
    totalImpact *= MULTI_KEY_FACTOR;
  }
  return Math.min(MAX_TOTAL_IMPACT, totalImpact);
}

/**
 * Legacy structural formula (Step 3): numKeys*1 + avgDeltaPercent/100*2 + overwrite*1.5
 */
function computeLegacyImpact(commitRequest: CommitRequest): number {
  const value = commitRequest.value;
  let overwriteCount = 1;
  let avgDeltaPercent = 0;
  if (isNumeric(value)) {
    overwriteCount = 0;
    avgDeltaPercent = Math.min(100, Math.abs(value));
  }
  return 1.0 + (avgDeltaPercent / 100) * 2.0 + overwriteCount * 1.5;
}

export class ImpactEstimator {
  estimateImpact(
    moduleName: string,
    commitRequest: CommitRequest,
    previousState?: Readonly<Record<string, unknown>>
  ): ImpactEstimate {
    const impactScore =
      previousState !== undefined
        ? computeProportionalImpact(commitRequest, previousState)
        : computeLegacyImpact(commitRequest);

    const value = commitRequest.value;
    const affectedKeys =
      isPlainObject(value) ? Object.keys(value) : [commitRequest.localKey];

    return Object.freeze({
      moduleName,
      impactScore,
      affectedKeys,
      timestamp: commitRequest.timestamp,
    });
  }
}
