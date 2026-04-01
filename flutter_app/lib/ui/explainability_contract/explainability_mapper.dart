// Phase 11.3.1 — Pure 1-to-1 mapping. No defaults, no interpretation.

import 'dart:convert';

import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/explanation_dto.dart';
import 'explainability_view_model.dart';

/// Maps validated trace + explanation to UI ViewModel. Deterministic, no logic.
ExplainabilityViewModel mapTraceToExplainability(
  DecisionTraceDto trace,
  ExplanationDto explanation,
) {
  if (trace.traceId != explanation.traceId) {
    throw ArgumentError('traceId mismatch: trace=${trace.traceId} explanation=${explanation.traceId}');
  }
  return ExplainabilityViewModel(
    traceId: trace.traceId,
    state: _canonicalMapString(trace.state),
    resolution: trace.resolution,
    outcomeStatus: trace.outcome.status,
    outcomeEffects: trace.outcome.effects.map(_effectToString).toList(),
    explanationTitle: explanation.title,
    explanationSummary: explanation.summary,
    explanationDetails: explanation.details,
    safetyLevel: explanation.safetyLevel,
    timestamp: trace.timestamp,
  );
}

String _canonicalMapString(Map<String, dynamic> map) {
  final keys = map.keys.toList()..sort();
  final parts = <String>[];
  for (final k in keys) {
    parts.add('${jsonEncode(k)}:${_valueString(map[k])}');
  }
  return '{${parts.join(',')}}';
}

String _valueString(dynamic v) {
  if (v == null) return 'null';
  if (v is String) return jsonEncode(v);
  if (v is num || v is bool) return v.toString();
  if (v is Map) return _canonicalMapString(Map<String, dynamic>.from(v));
  if (v is List) return '[${v.map(_valueString).join(',')}]';
  return jsonEncode(v).toString();
}

String _effectToString(dynamic e) {
  if (e is String) return e;
  return _valueString(e);
}
