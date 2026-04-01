// Phase 11.2.3 — Typed exception. Deterministic messages, no temporal data.

import '../dto/decision_trace_dto.dart';

/// Thrown when trace structure, hash or contract version is invalid.
class TraceValidationException implements Exception {
  const TraceValidationException(this.message, {this.trace});

  final String message;
  final DecisionTraceDto? trace;

  @override
  String toString() => 'TraceValidationException: $message';
}
