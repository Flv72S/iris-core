/**
 * Feature Toggle - contratto di una feature valutabile
 * Microstep 5.3.4
 *
 * Implementazione pura e deterministica.
 */

import type { FeatureDefinition } from './FeatureDefinition';
import type { FeatureEvaluationContext } from './FeatureEvaluationContext';
import type { FeatureDecision } from './FeatureDecision';
import { featureEnabled, featureDisabled } from './FeatureDecision';

export interface FeatureToggle {
  readonly definition: FeatureDefinition;
  evaluate(context: FeatureEvaluationContext): FeatureDecision;
}

/**
 * Confronto versioni semplice: a >= b.
 * Supporta "v1", "v2", "1.0", "2.0.0".
 */
function apiVersionAtLeast(actual: string, minRequired: string): boolean {
  const a = normalizeVersion(actual);
  const b = normalizeVersion(minRequired);
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}

function normalizeVersion(v: string): string {
  return v.replace(/^v/i, '').trim() || '0';
}

/**
 * Hash deterministico per rollout. Stesso input → stesso output.
 */
function deterministicHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Rollout bucket 0-99 per subject. Stesso subjectId + featureKey → stesso bucket.
 */
function rolloutBucket(subjectId: string, featureKey: string): number {
  const seed = `${featureKey}:${subjectId}`;
  return deterministicHash(seed) % 100;
}

/**
 * Crea un FeatureToggle dalla definizione (valutazione pura e deterministica).
 */
export function createFeatureToggle(definition: FeatureDefinition): FeatureToggle {
  return {
    definition,
    evaluate(context: FeatureEvaluationContext): FeatureDecision {
      const { key, defaultEnabled, environments, minApiVersion, rolloutPercentage } =
        definition;

      if (environments?.length && !environments.includes(context.environment)) {
        return featureDisabled(
          `Feature "${key}" is not enabled for environment "${context.environment}"`
        );
      }

      if (minApiVersion != null && !apiVersionAtLeast(context.apiVersion, minApiVersion)) {
        return featureDisabled(
          `Feature "${key}" requires apiVersion >= ${minApiVersion}, current: ${context.apiVersion}`
        );
      }

      if (
        rolloutPercentage != null &&
        rolloutPercentage >= 0 &&
        rolloutPercentage <= 100
      ) {
        const subject = context.subjectId ?? `default-${context.timestamp}`;
        const bucket = rolloutBucket(subject, key);
        if (bucket >= rolloutPercentage) {
          return featureDisabled(
            `Feature "${key}" rollout: bucket ${bucket} >= ${rolloutPercentage}%`
          );
        }
      }

      return defaultEnabled ? featureEnabled() : featureDisabled(
        `Feature "${key}" is off by default`
      );
    },
  };
}
