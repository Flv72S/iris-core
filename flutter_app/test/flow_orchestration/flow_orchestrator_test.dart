// F4 — Full flow simulation: start, next, back, jump.

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
  late FlowStepGraph graph;
  late FlowProgressionRules rules;
  late FlowNavigationModel navModel;
  late TestClock clock;
  late FlowOrchestrator orchestrator;

  setUp(() {
    const a = steps.FlowStepId('A');
    const b = steps.FlowStepId('B');
    const c = steps.FlowStepId('C');
    graph = FlowStepGraph(
      steps: [
        FlowStep(stepId: a, label: 'StepA'),
        FlowStep(stepId: b, label: 'StepB'),
        FlowStep(stepId: c, label: 'StepC'),
      ],
      initialStepId: a,
      edges: [
        FlowStepEdge(from: a, to: b),
        FlowStepEdge(from: b, to: c),
      ],
    );
    rules = FlowProgressionRules(terminalSteps: {c});
    navModel = FlowNavigationModel(graph: graph, rules: rules);
    clock = TestClock(FlowTimestamp(1000));
    orchestrator = FlowOrchestrator(navigationModel: navModel, clock: clock);
  });

  test('start then next next reaches C', () {
    var state = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('s1'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );
    expect(state.sessionContext.activeStep?.value, equals('A'));

    var result = orchestrator.moveNext(state);
    expect(result.isSuccess, isTrue);
    expect(result.newState.sessionContext.activeStep?.value, equals('B'));
    state = result.newState;

    result = orchestrator.moveNext(state);
    expect(result.isSuccess, isTrue);
    expect(result.newState.sessionContext.activeStep?.value, equals('C'));
    state = result.newState;

    result = orchestrator.moveNext(state);
    expect(result.isSuccess, isFalse);
    expect(result.navigationResult, equals(NavigationResult.blocked));
    expect(result.newState.sessionContext.activeStep?.value, equals('C'));
  });

  test('back from C then back from B returns to A', () {
    var state = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('s1'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );
    state = orchestrator.moveNext(state).newState;
    state = orchestrator.moveNext(state).newState;
    expect(state.sessionContext.activeStep?.value, equals('C'));

    var result = orchestrator.moveBack(state);
    expect(result.isSuccess, isTrue);
    expect(result.newState.sessionContext.activeStep?.value, equals('B'));
    state = result.newState;

    result = orchestrator.moveBack(state);
    expect(result.isSuccess, isTrue);
    expect(result.newState.sessionContext.activeStep?.value, equals('A'));
  });

  test('jump from A to B is allowed', () {
    var state = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('s1'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );
    final result = orchestrator.jumpTo(state, FlowStepId('B'));
    expect(result.isSuccess, isTrue);
    expect(result.newState.sessionContext.activeStep?.value, equals('B'));
  });

  test('jump from B to A is not defined', () {
    var state = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('s1'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );
    state = orchestrator.moveNext(state).newState;
    final result = orchestrator.jumpTo(state, FlowStepId('A'));
    expect(result.isSuccess, isFalse);
    expect(result.navigationResult, equals(NavigationResult.notDefined));
  });
}
