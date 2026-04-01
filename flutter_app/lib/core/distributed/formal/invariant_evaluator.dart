// ODA-8 — Evaluate active invariants. Pure; no state mutation.

import 'package:iris_flutter_app/core/distributed/formal/invariant_definition.dart';

class InvariantViolation {
  const InvariantViolation({
    required this.invariantId,
    required this.violated,
    this.message,
  });
  final String invariantId;
  final bool violated;
  final String? message;
}

class InvariantEvaluationResult {
  const InvariantEvaluationResult({
    required this.violations,
    required this.allPassed,
  });
  final List<InvariantViolation> violations;
  final bool allPassed;
}

class InvariantEvaluator {
  InvariantEvaluator._();

  /// Evaluate all active invariants. Deterministic; no mutation.
  static InvariantEvaluationResult evaluateAllInvariants({
    required Map<String, dynamic> systemState,
    required List<InvariantDefinition> activeInvariants,
    required Map<String, bool Function(Map<String, dynamic>)> validators,
  }) {
    final violations = <InvariantViolation>[];
    for (final inv in activeInvariants) {
      final validator = validators[inv.invariantId];
      final passed = validator != null && validator(systemState);
      if (!passed) {
        violations.add(InvariantViolation(invariantId: inv.invariantId, violated: true));
      }
    }
    return InvariantEvaluationResult(
      violations: violations,
      allPassed: violations.isEmpty,
    );
  }
}
