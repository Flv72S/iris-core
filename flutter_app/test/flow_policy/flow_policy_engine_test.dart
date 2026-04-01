// F6 — Policy engine: evaluate returns allow/block.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart' as binding;
import 'package:iris_flutter_app/flow_context_binding/flow_context_snapshot.dart';
import 'package:iris_flutter_app/flow_policy/flow_guardrail_violation.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_engine.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_registry.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_rule.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart' show FlowSessionId, FlowStepId, FlowTimestamp;
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';

void main() {
  late FlowPolicyRegistry registry;
  late FlowPolicyEngine engine;
  late FlowRuntimeState state;
  late TestClock clock;

  setUp(() {
    clock = TestClock(FlowTimestamp(1000));
    state = FlowRuntimeState.initial();
    state = state.copyWith(
      sessionContext: state.sessionContext.copyWith(
        sessionId: FlowSessionId('s1'),
        activeStep: FlowStepId('A'),
      ),
      temporalContext: state.temporalContext.copyWith(
        sessionStart: FlowTimestamp(1000),
      ),
    );
  });

  group('Structural guardrail', () {
    test('undeclared step access is blocked', () {
      registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r1',
          description: 'Step must be declared',
          evaluationType: PolicyEvaluationType.structural,
          params: {'requireStepDeclared': true},
        ),
      ]);
      engine = FlowPolicyEngine(
        registry: registry,
        allowedStepIds: {'A', 'B'},
      );
      final result = engine.evaluate(
        state,
        FlowStepId('C'),
        null,
        clock,
      );
      expect(result.allowed, isFalse);
      expect(result.violations.length, equals(1));
      expect(result.violations.first.reasonCode,
          equals(ViolationReasonCode.undeclaredStepAccess));
    });

    test('declared step passes structural rule', () {
      registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r1',
          description: 'Step must be declared',
          evaluationType: PolicyEvaluationType.structural,
          params: {'requireStepDeclared': true},
        ),
      ]);
      engine = FlowPolicyEngine(
        registry: registry,
        allowedStepIds: {'A', 'B'},
      );
      final result = engine.evaluate(
        state,
        FlowStepId('A'),
        null,
        clock,
      );
      expect(result.allowed, isTrue);
      expect(result.violations, isEmpty);
    });
  });

  group('Runtime guardrail', () {
    test('missing context binding is blocked', () {
      registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r2',
          description: 'Context must be bound',
          appliesTo: FlowStepId('A'),
          evaluationType: PolicyEvaluationType.runtime,
          params: {'requireContextBound': true},
        ),
      ]);
      engine = FlowPolicyEngine(registry: registry, allowedStepIds: {'A'});
      final result = engine.evaluate(state, FlowStepId('A'), null, clock);
      expect(result.allowed, isFalse);
      expect(result.violations.first.reasonCode,
          equals(ViolationReasonCode.stepContextNotBound));
    });

    test('bound context passes runtime rule', () {
      registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r2',
          description: 'Context must be bound',
          appliesTo: FlowStepId('A'),
          evaluationType: PolicyEvaluationType.runtime,
          params: {'requireContextBound': true},
        ),
      ]);
      engine = FlowPolicyEngine(registry: registry, allowedStepIds: {'A'});
      final snapshot = FlowContextSnapshot(
        snapshotId: 's1',
        boundAtStep: FlowStepId('A'),
        contextData: {binding.FlowContextKey('k'): 'v'},
      );
      final result = engine.evaluate(state, FlowStepId('A'), snapshot, clock);
      expect(result.allowed, isTrue);
    });
  });

  group('Temporal guardrail', () {
    test('session over max duration is blocked', () {
      registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r3',
          description: 'Session max duration',
          evaluationType: PolicyEvaluationType.temporal,
          params: {'maxSessionDurationMs': 500},
        ),
      ]);
      engine = FlowPolicyEngine(registry: registry, allowedStepIds: {'A'});
      clock.setNow(FlowTimestamp(2000));
      final result = engine.evaluate(state, FlowStepId('A'), null, clock);
      expect(result.allowed, isFalse);
      expect(result.violations.first.reasonCode,
          equals(ViolationReasonCode.sessionExpiredRuntime));
    });

    test('session within limit passes temporal rule', () {
      registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r3',
          description: 'Session max duration',
          evaluationType: PolicyEvaluationType.temporal,
          params: {'maxSessionDurationMs': 5000},
        ),
      ]);
      engine = FlowPolicyEngine(registry: registry, allowedStepIds: {'A'});
      clock.setNow(FlowTimestamp(1500));
      final result = engine.evaluate(state, FlowStepId('A'), null, clock);
      expect(result.allowed, isTrue);
    });
  });
}
