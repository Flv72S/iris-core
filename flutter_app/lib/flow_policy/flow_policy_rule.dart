// F6 — Policy rule. Declarative; no Core access, no normative logic.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

/// Type of evaluation. Structural, runtime, or temporal only.
enum PolicyEvaluationType {
  structural,
  runtime,
  temporal,
}

/// Single policy rule. Declarative metadata only.
class FlowPolicyRule {
  const FlowPolicyRule({
    required this.ruleId,
    required this.description,
    this.appliesTo,
    this.evaluationType = PolicyEvaluationType.structural,
    this.params = const {},
  });

  final String ruleId;
  final String description;
  /// Null = applies to all steps (global).
  final FlowStepId? appliesTo;
  final PolicyEvaluationType evaluationType;
  /// Optional parameters (e.g. maxDurationMs for temporal). No content evaluation.
  final Map<String, Object> params;

  bool appliesToStep(FlowStepId stepId) =>
      appliesTo == null || appliesTo!.value == stepId.value;
}
