// Phase 11.3.1 — Immutable validation result.

/// Result of explainability ViewModel validation.
class ExplainabilityValidationResult {
  const ExplainabilityValidationResult({
    required this.isValid,
    required this.errors,
  });

  final bool isValid;
  final List<String> errors;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExplainabilityValidationResult &&
          runtimeType == other.runtimeType &&
          isValid == other.isValid &&
          _listEq(errors, other.errors);

  @override
  int get hashCode => Object.hash(isValid, Object.hashAll(errors));

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }
}
