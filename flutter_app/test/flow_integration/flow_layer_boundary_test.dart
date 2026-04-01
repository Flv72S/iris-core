// FT — Layer boundary: graph/runtime/snapshot not mutated; no cross-layer access.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_orchestration/flow_orchestrator.dart';
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
  group('Layer boundary integrity', () {
    test('Step Graph is not mutated by orchestration', () {
      const a = steps.FlowStepId('A');
      const b = steps.FlowStepId('B');
      const c = steps.FlowStepId('C');
      final stepsList = [
        FlowStep(stepId: a, label: 'A'),
        FlowStep(stepId: b, label: 'B'),
        FlowStep(stepId: c, label: 'C'),
      ];
      final edgesList = [
        FlowStepEdge(from: a, to: b),
        FlowStepEdge(from: b, to: c),
      ];
      final graph = FlowStepGraph(
        steps: stepsList,
        initialStepId: a,
        edges: edgesList,
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

      final initialNextA = graph.getNextSteps(a);
      final initialPrevB = graph.getPreviousSteps(b);

      var state = FlowRuntimeState.initial().startSession(
        sessionId: FlowSessionId('boundary'),
        clock: clock,
        initialStep: FlowStepId('A'),
      );
      for (var i = 0; i < 5; i++) {
        final r = orchestrator.moveNext(state);
        if (r.isSuccess) state = r.newState;
        final r2 = orchestrator.moveBack(state);
        if (r2.isSuccess) state = r2.newState;
      }

      expect(graph.getNextSteps(a), equals(initialNextA));
      expect(graph.getPreviousSteps(b), equals(initialPrevB));
      expect(graph.stepIds.length, equals(3));
    });

    test('Runtime state not mutated: input state unchanged after handleTransition', () {
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
      expect(identical(state, result.newState), isFalse);
    });

    test('Deep equality: same inputs produce equal newState instances', () {
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

      final state1 = FlowRuntimeState.initial().startSession(
        sessionId: FlowSessionId('s1'),
        clock: clock,
        initialStep: FlowStepId('A'),
      );
      final state2 = FlowRuntimeState.initial().startSession(
        sessionId: FlowSessionId('s1'),
        clock: clock,
        initialStep: FlowStepId('A'),
      );

      final r1 = orchestrator.moveNext(state1);
      final r2 = orchestrator.moveNext(state2);

      expect(r1.newState, equals(r2.newState));
      expect(r1.newState.hashCode, equals(r2.newState.hashCode));
    });
  });

  group('Immutability enforcement', () {
    test('every transition creates new instance', () {
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

      var state = FlowRuntimeState.initial().startSession(
        sessionId: FlowSessionId('imm'),
        clock: clock,
        initialStep: FlowStepId('A'),
      );
      final seen = <int>{identityHashCode(state)};

      for (var i = 0; i < 4; i++) {
        final r = orchestrator.moveNext(state);
        if (r.isSuccess) {
          state = r.newState;
          expect(seen.contains(identityHashCode(state)), isFalse);
          seen.add(identityHashCode(state));
        }
      }
    });
  });
}
