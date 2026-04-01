// F4 — Validator: structural enforcement, no hidden logic.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_orchestration/flow_transition_request.dart';
import 'package:iris_flutter_app/flow_orchestration/flow_transition_validator.dart';
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
  late FlowStepGraph graph;
  late FlowProgressionRules rules;
  late FlowNavigationModel navModel;
  late FlowTransitionValidator validator;
  late TestClock clock;

  setUp(() {
    const a = steps.FlowStepId('A');
    const b = steps.FlowStepId('B');
    const c = steps.FlowStepId('C');
    graph = FlowStepGraph(
      steps: [
        FlowStep(stepId: a, label: 'A'),
        FlowStep(stepId: b, label: 'B'),
        FlowStep(stepId: c, label: 'C'),
      ],
      initialStepId: a,
      edges: [
        FlowStepEdge(from: a, to: b),
        FlowStepEdge(from: b, to: c),
      ],
    );
    rules = FlowProgressionRules(terminalSteps: {c});
    navModel = FlowNavigationModel(graph: graph, rules: rules);
    validator = FlowTransitionValidator(navigationModel: navModel);
    clock = TestClock(FlowTimestamp(0));
  });

  FlowRuntimeState stateAt(String stepValue) {
    return FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('s1'),
      clock: clock,
      initialStep: FlowStepId(stepValue),
    );
  }

  group('Structural enforcement', () {
    test('NEXT from terminal returns blocked', () {
      final state = stateAt('C');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.next,
      );
      expect(validator.validate(request), equals(NavigationResult.blocked));
    });

    test('NEXT from non-terminal with edge returns allowed', () {
      final state = stateAt('A');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.next,
      );
      expect(validator.validate(request), equals(NavigationResult.allowed));
    });

    test('BACK not allowed when no previous step', () {
      final state = stateAt('A');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.back,
      );
      expect(validator.validate(request), equals(NavigationResult.notDefined));
    });

    test('BACK allowed when previous step exists', () {
      final state = stateAt('B');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.back,
      );
      expect(validator.validate(request), equals(NavigationResult.allowed));
    });

    test('JUMP without targetStepId returns notDefined', () {
      final state = stateAt('A');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.jump,
      );
      expect(validator.validate(request), equals(NavigationResult.notDefined));
    });

    test('JUMP to existing step with edge returns allowed', () {
      final state = stateAt('A');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.jump,
        targetStepId: FlowStepId('B'),
      );
      expect(validator.validate(request), equals(NavigationResult.allowed));
    });
  });

  group('resolveNextTarget / resolveBackTarget', () {
    test('resolveNextTarget returns single next step', () {
      final state = stateAt('A');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.next,
      );
      expect(validator.resolveNextTarget(request)?.value, equals('B'));
    });

    test('resolveBackTarget returns single previous step', () {
      final state = stateAt('B');
      final request = FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.back,
      );
      expect(validator.resolveBackTarget(request)?.value, equals('A'));
    });
  });
}
