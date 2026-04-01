/**
 * Phase 16E — Observability layer (logging, metrics, tracing, event bridge).
 */

export type { IrisObservabilitySnapshot, IrisSpan } from './observability_contract.js';
export { IRIS_OFFICIAL_METRIC_KEYS } from './observability_contract.js';
export type { SpanSource } from './span_source.js';
export { createTracerSpanSource } from './span_source.js';
export {
  observabilitySnapshotPath,
  readObservabilitySnapshot,
  writeObservabilitySnapshot,
  isDeterministicSnapshot,
  sanitizeSnapshotForJson,
  writeLegacyDerivedFiles,
  OBSERVABILITY_SNAPSHOT_FILENAME,
} from './observability_persist.js';
export { validateObservabilitySnapshot, assertStateConsistency } from './observability_invariants.js';
export { normalizeSnapshot } from './normalize_snapshot.js';
export type { InvariantVerificationClass } from './invariant_classification.js';
export { RUNTIME_INVARIANT_CLASSIFICATION } from './invariant_classification.js';

export type { IrisLog, IrisLogLevel } from './logger/log_types.js';
export { formatLogJson, formatLogPretty } from './logger/log_formatter.js';
export { StructuredIrisLogger, parseLogLevel } from './logger/iris_logger.js';
export type { MetricsSnapshot, StandardMetricsSnapshot } from './metrics/metrics_types.js';
export { MetricsRegistry } from './metrics/metrics_registry.js';
export { writeMetricsSnapshot } from './metrics/metrics_persist.js';
export { writeTracerSpansSnapshot } from './tracing/traces_persist.js';
export type { OTelSpan, OTelKeyValue, OTelSpanStatus, OTelSpanEvent, OTelEventsConfig } from './opentelemetry/otel_types.js';
export { SpanKind, SpanStatusCode, DEFAULT_OTEL_EVENTS_CONFIG } from './opentelemetry/otel_types.js';
export {
  mapIrisSpanToOtel,
  mapAttributes,
  toHexId,
  msToUnixNanoString,
  irisTraceIdToOtlpTraceId,
  irisSpanIdToOtlpSpanId,
} from './opentelemetry/span_mapper.js';
export type { MapIrisSpanToOtelOpts } from './opentelemetry/span_mapper.js';
export { exportSpansToOtlpJson } from './opentelemetry/otlp_exporter.js';
export { postOtlpJson } from './opentelemetry/otlp_http.js';
export { OpenTelemetryAdapter } from './opentelemetry/otel_adapter.js';
export type { OpenTelemetryAdapterOptions } from './opentelemetry/otel_adapter.js';
export { resolveOtelConfig, OTEL_DEFAULTS } from './opentelemetry/otel_config.js';
export type { ResolvedOtelConfig } from './opentelemetry/otel_config.js';
export * from './alerting/index.js';
export { Span } from './tracing/span.js';
export type { SpanModel } from './tracing/span.js';
export { Tracer } from './tracing/tracer.js';
export type { StartSpanOptions } from './tracing/tracer.js';
export type { TraceContext } from './tracing/trace_context.js';
export {
  generateTraceId,
  generateSpanId,
  isValidTraceContext,
  runWithTraceContext,
  runWithTraceContextAsync,
  getActiveTraceContext,
} from './tracing/trace_context.js';
export type { ActiveSpanSource } from './tracing/trace_context.js';
export { ObservabilityBridge } from './events/observability_bridge.js';
export { resolveObservability } from './observability_context.js';
export type { ResolvedObservability } from './observability_context.js';
export { runStressTest } from './validation/stress_runner.js';
export { validateObservabilityState } from './validation/integrity_checker.js';
export { runObservabilityBenchmark } from './validation/benchmark.js';
export type { MetricLabels, PromMetric, PrometheusMetricsInput } from './prometheus/registry_adapter.js';
export { mapMetricsToPrometheus, isValidLabelSet } from './prometheus/registry_adapter.js';
export type { MetricDefinition } from './prometheus/metric_definitions.js';
export { METRIC_DEFINITIONS } from './prometheus/metric_definitions.js';
export { renderLabels, escapeLabelValue, renderPrometheusMetrics } from './prometheus/exporter.js';
export type { MetricsServerHandle } from './prometheus/http_server.js';
export { startMetricsServer } from './prometheus/http_server.js';
