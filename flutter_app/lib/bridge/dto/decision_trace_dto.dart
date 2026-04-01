// Phase 11.2.1 — Read-only DTO. No semantics, no defaults.
// Nested structures kept as Map/List for pass-through; outcome as DTO.

import 'outcome_dto.dart';

/// Decision trace payload from Core. Immutable, structural only.
class DecisionTraceDto {
  const DecisionTraceDto({
    required this.traceId,
    required this.signals,
    required this.state,
    required this.resolution,
    required this.execution,
    required this.outcome,
    required this.timestamp,
  });

  final String traceId;
  final Map<String, dynamic> signals;
  final Map<String, dynamic> state;
  final String resolution;
  final Map<String, dynamic> execution;
  final OutcomeDto outcome;
  final String timestamp;

  factory DecisionTraceDto.fromJson(Map<String, dynamic> json) {
    return DecisionTraceDto(
      traceId: json['traceId'] as String,
      signals: Map<String, dynamic>.from(json['signals'] as Map),
      state: Map<String, dynamic>.from(json['state'] as Map),
      resolution: json['resolution'] as String,
      execution: Map<String, dynamic>.from(json['execution'] as Map),
      outcome: OutcomeDto.fromJson(
          Map<String, dynamic>.from(json['outcome'] as Map)),
      timestamp: json['timestamp'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'traceId': traceId,
        'signals': Map<String, dynamic>.from(signals),
        'state': Map<String, dynamic>.from(state),
        'resolution': resolution,
        'execution': Map<String, dynamic>.from(execution),
        'outcome': outcome.toJson(),
        'timestamp': timestamp,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DecisionTraceDto &&
          runtimeType == other.runtimeType &&
          traceId == other.traceId &&
          _mapEquals(signals, other.signals) &&
          _mapEquals(state, other.state) &&
          resolution == other.resolution &&
          _mapEquals(execution, other.execution) &&
          outcome == other.outcome &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(
        traceId,
        Object.hashAll(signals.entries.map((e) => Object.hash(e.key, e.value))),
        Object.hashAll(state.entries.map((e) => Object.hash(e.key, e.value))),
        resolution,
        Object.hashAll(
            execution.entries.map((e) => Object.hash(e.key, e.value))),
        outcome,
        timestamp,
      );

  static bool _mapEquals(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }
}
