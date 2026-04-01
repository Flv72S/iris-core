// FT — System determinism: 100 iterations same sequence → identical state.

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
    const d = steps.FlowStepId('D');
    graph = FlowStepGraph(
      steps: [
        FlowStep(stepId: a, label: 'A'),
        FlowStep(stepId: b, label: 'B'),
        FlowStep(stepId: c, label: 'C'),
        FlowStep(stepId: d, label: 'D'),
      ],
      initialStepId: a,
      edges: [
        FlowStepEdge(from: a, to: b),
        FlowStepEdge(from: b, to: c),
        FlowStepEdge(from: c, to: d),
      ],
    );
    navModel = FlowNavigationModel(
      graph: graph,
      rules: FlowProgressionRules(),
    );
    clock = TestClock(FlowTimestamp(1000));
    orchestrator = FlowOrchestrator(navigationModel: navModel, clock: clock);
  });

  FlowRuntimeState runSequence(FlowRuntimeState start) {
    var state = start;
    var r = orchestrator.moveNext(state);
    if (!r.isSuccess) return state;
    state = r.newState;
    r = orchestrator.moveNext(state);
    if (!r.isSuccess) return state;
    state = r.newState;
    r = orchestrator.moveBack(state);
    if (!r.isSuccess) return state;
    state = r.newState;
    r = orchestrator.moveNext(state);
    if (!r.isSuccess) return state;
    state = r.newState;
    return state;
  }

  test('100 iterations of same sequence yield identical final state', () {
    final initial = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('det-test'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );

    FlowRuntimeState? reference;
    for (var i = 0; i < 100; i++) {
      clock.setNow(const FlowTimestamp(1000));
      final finalState = runSequence(initial);
      if (reference == null) {
        reference = finalState;
      } else {
        expect(finalState, equals(reference),
            reason: 'Iteration $i state must equal first run');
        expect(finalState.hashCode, equals(reference.hashCode),
            reason: 'Iteration $i hashCode must equal first run');
      }
    }
  });

  test('Clock isolation: TestClock used only, no real system time in sequence', () {
    clock.setNow(const FlowTimestamp(5000));
    final initial = FlowRuntimeState.initial().startSession(
      sessionId: FlowSessionId('clock-test'),
      clock: clock,
      initialStep: FlowStepId('A'),
    );
    final state = runSequence(initial);
    expect(state.temporalContext.sessionStart?.epochMillis, equals(5000));
  });
}
