// F6 — Policy engine. Pure; no mutation; no normative logic.

import 'package:iris_flutter_app/flow_context_binding/flow_context_snapshot.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';

import 'flow_guardrail_violation.dart';
import 'flow_policy_registry.dart';
import 'flow_policy_result.dart';
import 'flow_policy_rule.dart';

/// Evaluates policy rules. Pure; no side effects; allows or blocks only.
class FlowPolicyEngine {
  FlowPolicyEngine({
    required this.registry,
    this.allowedStepIds = const {},
  });

  final FlowPolicyRegistry registry;
  /// Step id values that are declared (e.g. from step graph). Used for structural rules.
  final Set<String> allowedStepIds;

  /// Evaluates all applicable rules. Does not mutate any input.
  FlowPolicyResult evaluate(
    FlowRuntimeState state,
    FlowStepId stepId,
    FlowContextSnapshot? contextSnapshot,
    FlowClock clock,
  ) {
    final rules = registry.getRulesForStep(stepId);
    final violations = <FlowGuardrailViolation>[];
    final evaluated = <String>[];

    for (final rule in rules) {
      evaluated.add(rule.ruleId);
      final v = _evaluateRule(rule, state, stepId, contextSnapshot, clock);
      violations.addAll(v);
    }

    return violations.isEmpty
        ? FlowPolicyResult.allow(evaluated)
        : FlowPolicyResult.block(violations, evaluated);
  }

  List<FlowGuardrailViolation> _evaluateRule(
    FlowPolicyRule rule,
    FlowRuntimeState state,
    FlowStepId stepId,
    FlowContextSnapshot? contextSnapshot,
    FlowClock clock,
  ) {
    switch (rule.evaluationType) {
      case PolicyEvaluationType.structural:
        return _checkStructural(rule, stepId);
      case PolicyEvaluationType.runtime:
        return _checkRuntime(rule, stepId, contextSnapshot);
      case PolicyEvaluationType.temporal:
        return _checkTemporal(rule, state, stepId, clock);
    }
  }

  List<FlowGuardrailViolation> _checkStructural(
    FlowPolicyRule rule,
    FlowStepId stepId,
  ) {
    final requireDeclared = rule.params['requireStepDeclared'] == true;
    if (!requireDeclared) return [];
    if (allowedStepIds.contains(stepId.value)) return [];
    return [
      FlowGuardrailViolation(
        violationId: '${rule.ruleId}-violation',
        stepId: stepId,
        reasonCode: ViolationReasonCode.undeclaredStepAccess,
      ),
    ];
  }

  List<FlowGuardrailViolation> _checkRuntime(
    FlowPolicyRule rule,
    FlowStepId stepId,
    FlowContextSnapshot? contextSnapshot,
  ) {
    final requireBound = rule.params['requireContextBound'] == true;
    if (!requireBound) return [];
    if (contextSnapshot != null &&
        contextSnapshot.boundAtStep.value == stepId.value &&
        contextSnapshot.contextData.isNotEmpty) {
      return [];
    }
    return [
      FlowGuardrailViolation(
        violationId: '${rule.ruleId}-violation',
        stepId: stepId,
        reasonCode: ViolationReasonCode.stepContextNotBound,
      ),
    ];
  }

  List<FlowGuardrailViolation> _checkTemporal(
    FlowPolicyRule rule,
    FlowRuntimeState state,
    FlowStepId stepId,
    FlowClock clock,
  ) {
    final maxMs = rule.params['maxSessionDurationMs'];
    if (maxMs is! int) return [];
    final elapsed = state.temporalContext.elapsedMillis(clock);
    if (elapsed <= maxMs) return [];
    return [
      FlowGuardrailViolation(
        violationId: '${rule.ruleId}-violation',
        stepId: stepId,
        reasonCode: ViolationReasonCode.sessionExpiredRuntime,
      ),
    ];
  }
}
