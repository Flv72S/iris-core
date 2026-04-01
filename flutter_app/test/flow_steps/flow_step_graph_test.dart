// F3 — Step graph: integrity, deterministic traversal.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_steps/flow_step.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_edge.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_graph.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart';

void main() {
  const aId = FlowStepId('a');
  const bId = FlowStepId('b');
  const cId = FlowStepId('c');

  final steps = [
    FlowStep(stepId: aId, label: 'A'),
    FlowStep(stepId: bId, label: 'B'),
    FlowStep(stepId: cId, label: 'C'),
  ];
  final edges = [
    FlowStepEdge(from: aId, to: bId),
    FlowStepEdge(from: bId, to: cId),
  ];

  group('Graph integrity', () {
    test('getInitialStep returns the designated initial step', () {
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      expect(graph.getInitialStep().stepId, equals(aId));
    });

    test('getNextSteps returns connected steps', () {
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      expect(graph.getNextSteps(aId), equals([bId]));
      expect(graph.getNextSteps(bId), equals([cId]));
      expect(graph.getNextSteps(cId), isEmpty);
    });

    test('getPreviousSteps returns reverse connections', () {
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      expect(graph.getPreviousSteps(bId), equals([aId]));
      expect(graph.getPreviousSteps(cId), equals([bId]));
    });

    test('getStep returns step by id or null', () {
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      expect(graph.getStep(aId)?.label, equals('A'));
      expect(graph.getStep(FlowStepId('x')), isNull);
    });

    test('stepIds contains all steps', () {
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      expect(graph.stepIds.length, equals(3));
      expect(graph.stepIds, contains(aId));
      expect(graph.stepIds, contains(bId));
      expect(graph.stepIds, contains(cId));
    });

    test('same graph yields same traversal', () {
      final g1 = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      final g2 = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      expect(g1.getNextSteps(aId), equals(g2.getNextSteps(aId)));
    });
  });

  group('Deterministic traversal', () {
    test('getNextSteps same input same output', () {
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
      final out1 = graph.getNextSteps(bId);
      final out2 = graph.getNextSteps(bId);
      expect(out1, equals(out2));
    });

    test('multiple edges from same node return all targets', () {
      final moreEdges = [
        FlowStepEdge(from: aId, to: bId),
        FlowStepEdge(from: aId, to: cId),
      ];
      final graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: moreEdges);
      final next = graph.getNextSteps(aId);
      expect(next.length, equals(2));
      expect(next, contains(bId));
      expect(next, contains(cId));
    });
  });

  group('Initial step validation', () {
    test('getInitialStep throws if initialStepId not in graph', () {
      final graph = FlowStepGraph(
        steps: steps,
        initialStepId: FlowStepId('missing'),
        edges: edges,
      );
      expect(() => graph.getInitialStep(), throwsStateError);
    });
  });
}
