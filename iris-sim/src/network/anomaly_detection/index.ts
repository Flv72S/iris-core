/**
 * Phase 13D — Anomaly Detection Engine.
 * Phase 13XX-D — Multi-Layer Rule-Based Anomaly Detection.
 */

export { AnomalyType, type AnomalyReport } from './anomaly_types.js';
export type { RuleAnomalyType, AnomalySeverity } from './anomaly_types.js';
export type { AnomalyEvent } from './anomaly_event.js';
export { freezeAnomalyEvent } from './anomaly_event.js';
export type { AnomalyContext, AnomalyRule } from './anomaly_rule.js';
export { AnomalyRuleRegistry } from './anomaly_rule_registry.js';
export { AnomalyDetector } from './anomaly_detector.js';
export { AnomalyEngine, type AnomalyEngineOptions } from './anomaly_engine.js';
export { AnomalyDetectionError, AnomalyDetectionErrorCode } from './anomaly_errors.js';
export { detectActivityOutliers } from './outlier_detector.js';
export { detectConsensusManipulation } from './consensus_manipulation_detector.js';
export { detectTrustCollusion } from './trust_graph_anomaly_detector.js';
export { detectSybilPatterns } from './sybil_detector.js';
export { detectNetworkAnomalies } from './anomaly_engine.js';
export { TrustSpikeRule } from './rules/trust_spike_rule.js';
