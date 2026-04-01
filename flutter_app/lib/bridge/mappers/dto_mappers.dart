// Phase 11.2.1 — Pure mappers. No semantics, no defaults. Explicit errors.

import '../dto/decision_trace_dto.dart';
import '../dto/explanation_dto.dart';
import '../dto/mode_dto.dart';
import '../dto/outcome_dto.dart';

/// Maps raw JSON to [DecisionTraceDto]. Fails explicitly on missing/wrong type.
DecisionTraceDto mapDecisionTrace(Map<String, dynamic> json) {
  _requireKey(json, 'traceId', String);
  _requireKey(json, 'signals', Map);
  _requireKey(json, 'state', Map);
  _requireKey(json, 'resolution', String);
  _requireKey(json, 'execution', Map);
  _requireKey(json, 'outcome', Map);
  _requireKey(json, 'timestamp', String);
  return DecisionTraceDto.fromJson(json);
}

/// Maps raw JSON to [ExplanationDto]. Fails explicitly on missing/wrong type.
ExplanationDto mapExplanation(Map<String, dynamic> json) {
  _requireKey(json, 'title', String);
  _requireKey(json, 'summary', String);
  _requireKey(json, 'details', String);
  _requireKey(json, 'safetyLevel', String);
  _requireKey(json, 'traceId', String);
  return ExplanationDto.fromJson(json);
}

/// Maps raw JSON to [ModeDto]. Fails explicitly on missing/wrong type.
ModeDto mapMode(Map<String, dynamic> json) {
  _requireKey(json, 'modeId', String);
  _requireKey(json, 'label', String);
  return ModeDto.fromJson(json);
}

/// Maps raw JSON to [OutcomeDto]. Fails explicitly on missing/wrong type.
OutcomeDto mapOutcome(Map<String, dynamic> json) {
  _requireKey(json, 'status', String);
  _requireKey(json, 'effects', List);
  return OutcomeDto.fromJson(json);
}

void _requireKey(Map<String, dynamic> json, String key, Type type) {
  if (!json.containsKey(key)) {
    throw ArgumentError('Bridge mapper: missing required key "$key"');
  }
  final v = json[key];
  if (v == null) {
    throw ArgumentError('Bridge mapper: key "$key" is null');
  }
  if (type == String && v is! String) {
    throw ArgumentError('Bridge mapper: key "$key" must be String, got ${v.runtimeType}');
  }
  if (type == Map && v is! Map) {
    throw ArgumentError('Bridge mapper: key "$key" must be Map, got ${v.runtimeType}');
  }
  if (type == List && v is! List) {
    throw ArgumentError('Bridge mapper: key "$key" must be List, got ${v.runtimeType}');
  }
}
