// F6 — Policy evaluation result. Technical only; no inference.

import 'flow_guardrail_violation.dart';

/// Result of policy evaluation. Immutable.
class FlowPolicyResult {
  const FlowPolicyResult({
    required this.allowed,
    this.violations = const [],
    this.evaluatedRules = const [],
  });

  final bool allowed;
  final List<FlowGuardrailViolation> violations;
  final List<String> evaluatedRules;

  static FlowPolicyResult allow(List<String> rules) =>
      FlowPolicyResult(allowed: true, evaluatedRules: rules);

  static FlowPolicyResult block(
    List<FlowGuardrailViolation> violations,
    List<String> rules,
  ) =>
      FlowPolicyResult(
        allowed: false,
        violations: violations,
        evaluatedRules: rules,
      );
}
