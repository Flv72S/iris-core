// H9 - CI violation. Immutable; ERROR blocks, WARNING signals.

enum MetaGovernanceViolationSeverity {
  error,
  warning,
}

class MetaGovernanceViolation {
  const MetaGovernanceViolation({
    required this.id,
    required this.rule,
    required this.description,
    required this.suggestedFix,
    required this.severity,
  });

  final String id;
  final String rule;
  final String description;
  final String suggestedFix;
  final MetaGovernanceViolationSeverity severity;

  bool get isError => severity == MetaGovernanceViolationSeverity.error;

  @override
  String toString() =>
      '[$severity] $id ($rule): $description\n  Fix: $suggestedFix';
}
