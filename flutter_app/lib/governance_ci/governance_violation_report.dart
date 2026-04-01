// G7 - Violation report. ERROR blocks CI; WARNING does not.

/// Severity of a governance violation.
enum GovernanceViolationSeverity {
  error,
  warning,
}

/// A single governance violation.
class GovernanceViolation {
  const GovernanceViolation({
    required this.id,
    required this.scope,
    required this.rule,
    required this.severity,
    required this.description,
    this.suggestedFix,
  });

  final String id;
  final String scope;
  final String rule;
  final GovernanceViolationSeverity severity;
  final String description;
  final String? suggestedFix;

  bool get blocksCi => severity == GovernanceViolationSeverity.error;

  @override
  String toString() =>
      '[$severity] $id ($rule): $description${suggestedFix != null ? '\n  Fix: $suggestedFix' : ''}';
}
