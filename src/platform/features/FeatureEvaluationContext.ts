/**
 * Feature Evaluation Context - contesto di valutazione
 * Microstep 5.3.4
 *
 * Immutabile e serializzabile. Costruito dal core.
 */

import type { FeatureEnvironment } from './FeatureDefinition';

export interface FeatureEvaluationContext {
  readonly environment: FeatureEnvironment;
  readonly apiVersion: string;
  readonly timestamp: number;
  /** Per rollout deterministico / futuro tenant. */
  readonly subjectId?: string;
}

/** Crea un contesto immutabile (frozen). */
export function createFeatureEvaluationContext(
  input: Readonly<{
    environment: FeatureEnvironment;
    apiVersion: string;
    timestamp?: number;
    subjectId?: string;
  }>
): FeatureEvaluationContext {
  return Object.freeze({
    environment: input.environment,
    apiVersion: input.apiVersion,
    timestamp: input.timestamp ?? Date.now(),
    subjectId: input.subjectId,
  });
}
