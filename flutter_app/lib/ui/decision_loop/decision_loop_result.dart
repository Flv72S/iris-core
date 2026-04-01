// Phase 11.4.1 — Immutable DTO for audit and deterministic tests. No logic.

/// Result of one decision loop execution. Audit and test only.
class DecisionLoopResult {
  const DecisionLoopResult({
    required this.traceId,
    required this.storeHashAfterSave,
    required this.isSuccess,
    required this.errors,
  });

  final String traceId;
  final String storeHashAfterSave;
  final bool isSuccess;
  final List<String> errors;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DecisionLoopResult &&
          runtimeType == other.runtimeType &&
          traceId == other.traceId &&
          storeHashAfterSave == other.storeHashAfterSave &&
          isSuccess == other.isSuccess &&
          _listEquals(errors, other.errors);

  @override
  int get hashCode =>
      Object.hash(traceId, storeHashAfterSave, isSuccess, Object.hashAll(errors));

  static bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
