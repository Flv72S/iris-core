// Phase 11.2.3 — Pure formal validation. No DateTime, no Random, no business logic.

import '../contracts/bridge_contract.dart';
import '../dto/decision_trace_dto.dart';
import '../dto/outcome_dto.dart';
import '../mappers/hash_utils.dart';
import 'trace_validation_exception.dart';
import 'validated_trace_result.dart';

/// Deterministic trace validation. Structure, hash, contract version only.
class TraceValidator {
  TraceValidator();

  /// Validates raw map has required keys and types. For payload before DTO mapping.
  List<String> validateStructureFromMap(Map<String, dynamic> json) {
    final errors = <String>[];
    _requireKey(json, 'traceId', String, errors);
    _requireKey(json, 'signals', Map, errors);
    _requireKey(json, 'state', Map, errors);
    _requireKey(json, 'resolution', String, errors);
    _requireKey(json, 'execution', Map, errors);
    _requireKey(json, 'outcome', Map, errors);
    _requireKey(json, 'timestamp', String, errors);
    if (json.containsKey('outcome') && json['outcome'] is Map) {
      final out = json['outcome'] as Map;
      if (!out.containsKey('status')) errors.add('outcome missing status');
      else if (out['status'] is! String) errors.add('outcome.status must be String');
      if (!out.containsKey('effects')) errors.add('outcome missing effects');
      else if (out['effects'] is! List) errors.add('outcome.effects must be List');
    }
    return errors;
  }

  /// Validates DTO structure (non-empty required strings, outcome present).
  List<String> validateStructure(DecisionTraceDto trace) {
    final errors = <String>[];
    if (trace.traceId.isEmpty) errors.add('traceId must be non-empty');
    if (trace.resolution.isEmpty) errors.add('resolution must be non-empty');
    if (trace.timestamp.isEmpty) errors.add('timestamp must be non-empty');
    if (trace.outcome.status.isEmpty) errors.add('outcome.status must be non-empty');
    return errors;
  }

  /// Validates trace hash against expected. If expectedHash is null/empty, no check.
  List<String> validateHash(DecisionTraceDto trace, String? expectedHash) {
    if (expectedHash == null || expectedHash.isEmpty) return [];
    final computed = computeDeterministicHash(trace.toJson());
    if (computed != expectedHash) {
      return <String>['hash mismatch: expected $expectedHash, got $computed'];
    }
    return [];
  }

  /// Validates received contract version matches bridge contract.
  List<String> validateContractVersion(String? receivedVersion) {
    if (receivedVersion == null || receivedVersion.isEmpty) {
      return <String>['contract version missing'];
    }
    if (receivedVersion != irisBridgeContractVersion) {
      return <String>['contract version incompatible: expected $irisBridgeContractVersion, got $receivedVersion'];
    }
    return [];
  }

  /// Runs all validations. Returns ValidatedTraceResult; throws if throwOnInvalid and not valid.
  ValidatedTraceResult validateAll(
    DecisionTraceDto trace, {
    String? expectedHash,
    String? contractVersion,
    bool throwOnInvalid = false,
  }) {
    final errors = <String>[]
      ..addAll(validateStructure(trace))
      ..addAll(validateHash(trace, expectedHash))
      ..addAll(validateContractVersion(contractVersion));
    final isValid = errors.isEmpty;
    final result = ValidatedTraceResult(trace: trace, isValid: isValid, errors: List<String>.from(errors));
    if (throwOnInvalid && !isValid) {
      throw TraceValidationException(errors.join('; '), trace: trace);
    }
    return result;
  }

  void _requireKey(Map<String, dynamic> json, String key, Type type, List<String> errors) {
    if (!json.containsKey(key)) {
      errors.add('missing required key: $key');
      return;
    }
    final v = json[key];
    if (v == null) {
      errors.add('key $key is null');
      return;
    }
    if (type == String && v is! String) errors.add('key $key must be String');
    if (type == Map && v is! Map) errors.add('key $key must be Map');
  }
}
