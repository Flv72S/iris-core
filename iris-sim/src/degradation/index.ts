/**
 * S-6 — Emergent Degradation Modeling Layer. Deterministic, seed-driven, hash-stable.
 */

export {
  type DegradationConfig,
  DEFAULT_DEGRADATION_CONFIG,
  createDegradationConfig,
  degradationConfigHashPayload,
} from './core/DegradationConfig.js';
export {
  type NodeDegradationState,
  type QueuedMessage,
  createNodeDegradationState,
} from './core/DegradationState.js';
export {
  DegradationEngine,
  type DeliverToNodeFn,
  type GetPartitionedFn,
  type DegradationEngineParams,
} from './core/DegradationEngine.js';
export { processInboundQueue, type QueueModelResult } from './congestion/QueueModel.js';
export { computeBackpressure } from './congestion/BackpressureModel.js';
export { computeEffectiveLatency } from './congestion/LatencyAmplifier.js';
export { computeDropIndex, applyDrop } from './failure/DeterministicDropModel.js';
export {
  isInCorrelatedFailureWindow,
  correlatedCapacityMultiplier,
} from './failure/CorrelatedFailureModel.js';
export {
  type SaturationSignals,
  checkSaturationSignals,
  DEFAULT_SATURATION_N_CONSECUTIVE,
  DEFAULT_SATURATION_DROP_RATE_PERCENT,
  DEFAULT_SATURATION_LATENCY_THRESHOLD,
} from './failure/SaturationThreshold.js';
export {
  type DegradationMetrics,
  createEmptyDegradationMetrics,
} from './metrics/DegradationMetrics.js';
export {
  type DegradationSnapshot,
  snapshotFromStates,
} from './metrics/DegradationSnapshot.js';
