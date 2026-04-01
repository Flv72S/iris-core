// F6 — Guardrail: structural, context, temporal blocking.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_policy/flow_guardrail_violation.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_engine.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_registry.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_rule.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';

void main() {
  test('structural: step not in allowed set triggers violation', () {
    final registry = FlowPolicyRegistry(rules: [
      FlowPolicyRule(
        ruleId: 'declared-only',
        description: 'Only declared steps',
        evaluationType: PolicyEvaluationType.structural,
        params: {'requireStepDeclared': true},
      ),
    ]);
    final engine = FlowPolicyEngine(
      registry: registry,
      allowedStepIds: {'start', 'next'},
    );
    final state = FlowRuntimeState.initial();
    state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        activeStep: FlowStepId('start'),
      ),
    );
    final clock = TestClock(FlowTimestamp(0));
    final result = engine.evaluate(
      state,
      FlowStepId('jump-to-unknown'),
      null,
      clock,
    );
    expect(result.allowed, isFalse);
    expect(
      result.violations.any((v) =>
          v.reasonCode == ViolationReasonCode.undeclaredStepAccess),
      isTrue,
    );
  });

  test('runtime: missing context snapshot triggers violation', () {
    final registry = FlowPolicyRegistry(rules: [
      FlowPolicyRule(
        ruleId: 'context-required',
        description: 'Context must be bound',
        appliesTo: FlowStepId('B'),
        evaluationType: PolicyEvaluationType.runtime,
        params: {'requireContextBound': true},
      ),
    ]);
    final engine = FlowPolicyEngine(
      registry: registry,
      allowedStepIds: {'B'},
    );
    final state = FlowRuntimeState.initial();
    state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        activeStep: FlowStepId('B'),
      ),
    );
    final result = engine.evaluate(
      state,
      FlowStepId('B'),
      null,
      TestClock(FlowTimestamp(0)),
    );
    expect(result.allowed, isFalse);
    expect(
      result.violations.any((v) =>
          v.reasonCode == ViolationReasonCode.stepContextNotBound),
      isTrue,
    );
  });

  test('temporal: session over max duration blocks', () {
    final registry = FlowPolicyRegistry(rules: [
      FlowPolicyRule(
        ruleId: 'session-cap',
        description: 'Session max duration UX',
        evaluationType: PolicyEvaluationType.temporal,
        params: {'maxSessionDurationMs': 100},
      ),
    ]);
    final engine = FlowPolicyEngine(
      registry: registry,
      allowedStepIds: {'A'},
    );
    var state = FlowRuntimeState.initial();
    state = state.copyWith(
      sessionContext: state.sessionContext.copyWith(activeStep: FlowStepId('A')),
      temporalContext: state.temporalContext.copyWith(
        sessionStart: FlowTimestamp(0),
      ),
    );
    final clock = TestClock(FlowTimestamp(500));
    final result = engine.evaluate(state, FlowStepId('A'), null, clock);
    expect(result.allowed, isFalse);
    expect(
      result.violations.any((v) =>
          v.reasonCode == ViolationReasonCode.sessionExpiredRuntime),
      isTrue,
    );
  });
}
