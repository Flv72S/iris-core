// Phase 11.2.3 — Immutable result. No mutability.

import '../dto/decision_trace_dto.dart';

/// Result of trace validation. Read-only.
class ValidatedTraceResult {
  const ValidatedTraceResult({
    required this.trace,
    required this.isValid,
    required this.errors,
  });

  final DecisionTraceDto trace;
  final bool isValid;
  final List<String> errors;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ValidatedTraceResult &&
          runtimeType == other.runtimeType &&
          trace == other.trace &&
          isValid == other.isValid &&
          _listEquals(errors, other.errors);

  @override
  int get hashCode => Object.hash(trace, isValid, Object.hashAll(errors));

  static bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
