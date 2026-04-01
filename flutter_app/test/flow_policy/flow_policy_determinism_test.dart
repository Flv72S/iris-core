// F6 — Determinism and no normative logic scan.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_snapshot.dart';
import 'package:iris_flutter_app/flow_context_binding/flow_context_key.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_engine.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_registry.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_result.dart';
import 'package:iris_flutter_app/flow_policy/flow_policy_rule.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';

void main() {
  group('Determinism', () {
    test('same inputs 100 times yield same result', () {
      final registry = FlowPolicyRegistry(rules: [
        FlowPolicyRule(
          ruleId: 'r1',
          description: 'Structural',
          evaluationType: PolicyEvaluationType.structural,
          params: {'requireStepDeclared': true},
        ),
      ]);
      final engine = FlowPolicyEngine(
        registry: registry,
        allowedStepIds: {'A'},
      );
      final state = FlowRuntimeState.initial();
      state.copyWith(
        sessionContext: state.sessionContext.copyWith(
          activeStep: FlowStepId('A'),
        ),
      );
      final clock = TestClock(FlowTimestamp(1000));
      FlowPolicyResult? ref;
      for (var i = 0; i < 100; i++) {
        final result = engine.evaluate(
          state,
          FlowStepId('A'),
          null,
          clock,
        );
        if (ref == null) {
          ref = result;
        } else {
          expect(result.allowed, equals(ref!.allowed));
          expect(result.violations.length, equals(ref!.violations.length));
        }
      }
    });
  });

  group('No normative logic scan', () {
    test('flow_policy has no normative keywords', () {
      final dir = Directory('lib/flow_policy');
      expect(dir.existsSync(), isTrue);
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();
      const forbidden = [
        'legal',
        'compliance',
        'validate',
        'certified',
        'decision',
        'scoring',
      ];
      for (final file in files) {
        final content = file.readAsStringSync();
        for (final token in forbidden) {
          expect(
            content.contains(token),
            isFalse,
            reason: '${file.path} must not contain normative $token',
          );
        }
      }
    });
  });
}
