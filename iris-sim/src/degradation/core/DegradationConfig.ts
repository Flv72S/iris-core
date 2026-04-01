/**
 * S-6 — Deterministic degradation parameters. All included in simulation hash.
 */

export interface DegradationConfig {
  readonly maxQueueSizePerNode: number;
  readonly baseProcessingCapacityPerTick: number;
  readonly congestionLatencyFactor: number;
  readonly dropThresholdRatio: number;
  readonly correlatedFailureWindow: number;
  readonly correlatedFailureMultiplier: number;
  readonly degradationEnabled: boolean;
  /** S-5F: experimental; when true, do not cap latency multiplier at 5. Default false. */
  readonly disableLatencyCap?: boolean;
  /** S-5F: experimental; when true, skip backpressure (capacity/latency delta). Default false. */
  readonly disableBackpressure?: boolean;
  /** S-5F: experimental; when true, use full capacity even when queue over threshold. Default false. */
  readonly disableSaturationGuard?: boolean;
  /** S-6A: positive congestion feedback; when > 0, effective capacity is reduced by (1 + alpha * congestionFactor). Default 0 = backward compatible. */
  readonly positiveCongestionAlpha?: number;
}

export const DEFAULT_DEGRADATION_CONFIG: DegradationConfig = Object.freeze({
  maxQueueSizePerNode: 500,
  baseProcessingCapacityPerTick: 20,
  congestionLatencyFactor: 0.5,
  dropThresholdRatio: 0.9,
  correlatedFailureWindow: 100,
  correlatedFailureMultiplier: 2,
  degradationEnabled: true,
});

export function createDegradationConfig(overrides: Partial<DegradationConfig> = {}): DegradationConfig {
  return Object.freeze({ ...DEFAULT_DEGRADATION_CONFIG, ...overrides });
}

/** Canonical string for hash inclusion. */
export function degradationConfigHashPayload(config: DegradationConfig): string {
  return [
    String(config.maxQueueSizePerNode),
    String(config.baseProcessingCapacityPerTick),
    String(config.congestionLatencyFactor),
    String(config.dropThresholdRatio),
    String(config.correlatedFailureWindow),
    String(config.correlatedFailureMultiplier),
    config.degradationEnabled ? '1' : '0',
    config.disableLatencyCap ? '1' : '0',
    config.disableBackpressure ? '1' : '0',
    config.disableSaturationGuard ? '1' : '0',
    String(config.positiveCongestionAlpha ?? 0),
  ].join('|');
}
