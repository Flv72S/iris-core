// FT — E2E technical simulation: start, next, next, back, next, complete.

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
  late FlowNavigationModel navModel;
  late TestClock clock;
  late FlowOrchestrator orchestrator;

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
    navModel = FlowNavigationModel(
      graph: graph,
      rules: FlowProgressionRules(terminalSteps: {c}),
    );
    clock = TestClock(FlowTimestamp(2000));
    orchestrator = FlowOrchestrator(navigationModel: navModel, clock: clock);
  });

  test('E2E: Start -> NEXT -> NEXT -> BACK -> NEXT -> COMPLETE', () {
    final snapshotId = 'mock-snapshot-1';
    var state = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('e2e-session'),
      clock: clock,
      snapshotId: snapshotId,
      initialStep: FlowStepId('A'),
    );

    expect(state.sessionContext.snapshotId, equals(snapshotId));
    expect(state.sessionContext.activeStep?.value, equals('A'));

    var result = orchestrator.moveNext(state);
    expect(result.isSuccess, isTrue);
    expect(identical(state, result.newState), isFalse);
    state = result.newState;
    expect(state.sessionContext.activeStep?.value, equals('B'));

    result = orchestrator.moveNext(state);
    expect(result.isSuccess, isTrue);
    state = result.newState;
    expect(state.sessionContext.activeStep?.value, equals('C'));

    result = orchestrator.moveBack(state);
    expect(result.isSuccess, isTrue);
    state = result.newState;
    expect(state.sessionContext.activeStep?.value, equals('B'));

    result = orchestrator.moveNext(state);
    expect(result.isSuccess, isTrue);
    state = result.newState;
    expect(state.sessionContext.activeStep?.value, equals('C'));

    state = state.complete();
    expect(state.orchestrationState.status.name, equals('completed'));
    expect(state.sessionContext.activeStep?.value, equals('C'));
  });

  test('Immutability: every transition returns new instance', () {
    var state = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('imm'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );
    final before = state;
    final result = orchestrator.moveNext(state);
    expect(identical(before, result.newState), isFalse);
    expect(identical(before, state), isTrue);
    state = result.newState;
    final result2 = orchestrator.moveBack(state);
    expect(identical(state, result2.newState), isFalse);
  });
}
