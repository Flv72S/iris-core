// F4 — Determinism, immutability, no forbidden deps.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_orchestration/flow_orchestrator.dart';
import 'package:iris_flutter_app/flow_orchestration/flow_transition_request.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';
import 'package:iris_flutter_app/flow_steps/flow_navigation_model.dart';
import 'package:iris_flutter_app/flow_steps/flow_progression_rules.dart';
import 'package:iris_flutter_app/flow_steps/flow_step.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_edge.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_graph.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart' as steps;

void main() {
  group('Deterministic transition', () {
    test('same state and action produce same result', () {
      const a = steps.FlowStepId('A');
      const b = steps.FlowStepId('B');
      final graph = FlowStepGraph(
        steps: [
          FlowStep(stepId: a, label: 'A'),
          FlowStep(stepId: b, label: 'B'),
        ],
        initialStepId: a,
        edges: [FlowStepEdge(from: a, to: b)],
      );
      final navModel = FlowNavigationModel(
        graph: graph,
        rules: FlowProgressionRules(),
      );
      final clock = TestClock(FlowTimestamp(100));
      final orchestrator = FlowOrchestrator(
        navigationModel: navModel,
        clock: clock,
      );
      final state = FlowRuntimeState.initial().startSession(
        sessionId: FlowSessionId('s1'),
        clock: clock,
        initialStep: FlowStepId('A'),
      );
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.next,
      );

      final r1 = orchestrator.handleTransition(request);
      final r2 = orchestrator.handleTransition(request);
      expect(r1.navigationResult, equals(r2.navigationResult));
      expect(r1.newState.sessionContext.activeStep?.value,
          equals(r2.newState.sessionContext.activeStep?.value));
      expect(r1.newState, equals(r2.newState));
    });
  });

  group('State immutability', () {
    test('currentState is not modified by handleTransition', () {
      const a = steps.FlowStepId('A');
      const b = steps.FlowStepId('B');
      final graph = FlowStepGraph(
        steps: [
          FlowStep(stepId: a, label: 'A'),
          FlowStep(stepId: b, label: 'B'),
        ],
        initialStepId: a,
        edges: [FlowStepEdge(from: a, to: b)],
      );
      final navModel = FlowNavigationModel(
        graph: graph,
        rules: FlowProgressionRules(),
      );
      final clock = TestClock(FlowTimestamp(0));
      final orchestrator = FlowOrchestrator(
        navigationModel: navModel,
        clock: clock,
      );
      final state = FlowRuntimeState.initial().startSession(
        sessionId: FlowSessionId('s1'),
        clock: clock,
        initialStep: FlowStepId('A'),
      );
      final result = orchestrator.moveNext(state);
      expect(state.sessionContext.activeStep?.value, equals('A'));
      expect(result.newState.sessionContext.activeStep?.value, equals('B'));
      expect(identical(state, result.newState), isFalse);
    });
  });

  group('No forbidden dependencies', () {
    test('flow_orchestration does not import core_consumption or UI', () {
      final dir = Directory('lib/flow_orchestration');
      expect(dir.existsSync(), isTrue);
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();
      for (final file in files) {
        final content = file.readAsStringSync();
        expect(
          content.contains('flow_core_consumption') ||
              content.contains('core_consumption'),
          isFalse,
          reason: '${file.path} must not import core_consumption',
        );
      }
    });

    test('flow_orchestration has no DateTime.now Timer Random async IO', () {
      final dir = Directory('lib/flow_orchestration');
      final files = dir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();
      const forbidden = ['DateTime.now', 'Timer(', 'Random', 'async ', 'dart:io'];
      for (final file in files) {
        final content = file.readAsStringSync();
        for (final token in forbidden) {
          expect(
            content.contains(token),
            isFalse,
            reason: '${file.path} must not contain $token',
          );
        }
      }
    });
  });
}
