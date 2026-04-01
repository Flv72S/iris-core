// F6 — Guardrail violation. Technical only.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

/// Technical reason code. Not a normative judgment.
enum ViolationReasonCode {
  invalidTransitionSequence,
  stepContextNotBound,
  temporalInconsistency,
  sessionExpiredRuntime,
  undeclaredStepAccess,
}

/// Single guardrail violation. Immutable.
class FlowGuardrailViolation {
  const FlowGuardrailViolation({
    required this.violationId,
    required this.stepId,
    required this.reasonCode,
    this.metadata = const {},
  });

  final String violationId;
  final FlowStepId stepId;
  final ViolationReasonCode reasonCode;
  final Map<String, Object> metadata;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowGuardrailViolation &&
          violationId == other.violationId &&
          stepId == other.stepId &&
          reasonCode == other.reasonCode);

  @override
  int get hashCode => Object.hash(violationId, stepId, reasonCode);
}
