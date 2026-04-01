/**
 * Step 7A — Build normalized metric vector from tiering input.
 */

import { clamp01 } from './normalization.js';
import type { NormalizedMetricVector } from './tieringModel.js';
import type { TieringModelConfig } from './tieringModel.js';
import { normalizeLog, normalizeExp } from './normalization.js';

const DEFAULT_MAX_FLIP_RATE = 0.5;
const VIOLATION_EXP_FACTOR = 2;
const VIOLATION_FREQ_EXP_FACTOR = 2;

/**
 * Input metrics for building the vector. All optional; missing => best score (1) for that dimension.
 */
export interface TieringMetricsInput {
  readonly flipRate?: number;
  readonly entropyIndex?: number;
  readonly invariantViolationCount?: number;
  readonly violationFrequency?: number;
}

export function buildNormalizedVector(
  input: TieringMetricsInput,
  _config: TieringModelConfig
): NormalizedMetricVector {
  const flipRate = input.flipRate ?? 0;
  const entropyIndex = clamp01(input.entropyIndex ?? 0);
  const invCount = input.invariantViolationCount ?? 0;
  const violationFreq = input.violationFrequency ?? 0;

  const flipStability = normalizeLog(flipRate, DEFAULT_MAX_FLIP_RATE);
  const invariantIntegrity = normalizeExp(invCount, VIOLATION_EXP_FACTOR);
  const entropyControl = 1 - entropyIndex;
  const violationPressure = normalizeExp(violationFreq, VIOLATION_FREQ_EXP_FACTOR);

  return Object.freeze({
    flipStability: clamp01(flipStability),
    invariantIntegrity: clamp01(invariantIntegrity),
    entropyControl: clamp01(entropyControl),
    violationPressure: clamp01(violationPressure),
  });
}
