// F3 — Navigation model: forward/back/jump/preview; safety.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_steps/flow_navigation_model.dart';
import 'package:iris_flutter_app/flow_steps/flow_progression_rules.dart';
import 'package:iris_flutter_app/flow_steps/flow_step.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_edge.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_graph.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart';

void main() {
  late FlowStepId aId;
  late FlowStepId bId;
  late FlowStepId cId;
  late FlowStepGraph graph;
  late FlowProgressionRules rules;
  late FlowNavigationModel nav;

  setUp(() {
    aId = const FlowStepId('a');
    bId = const FlowStepId('b');
    cId = const FlowStepId('c');
    final steps = [
      FlowStep(stepId: aId, label: 'A'),
      FlowStep(stepId: bId, label: 'B'),
      FlowStep(stepId: cId, label: 'C'),
    ];
    final edges = [
      FlowStepEdge(from: aId, to: bId),
      FlowStepEdge(from: bId, to: cId),
    ];
    graph = FlowStepGraph(steps: steps, initialStepId: aId, edges: edges);
    rules = FlowProgressionRules(terminalSteps: {cId});
    nav = FlowNavigationModel(graph: graph, rules: rules);
  });

  group('Forward navigation', () {
    test('NEXT allowed when edge exists and step not terminal', () {
      expect(nav.forwardNavigation(aId, bId), equals(NavigationResult.allowed));
      expect(nav.forwardNavigation(bId, cId), equals(NavigationResult.allowed));
    });

    test('NEXT blocked from terminal step', () {
      expect(nav.forwardNavigation(cId, bId), equals(NavigationResult.blocked));
      expect(nav.forwardNavigation(cId, aId), equals(NavigationResult.blocked));
    });

    test('NEXT not defined when no edge', () {
      expect(nav.forwardNavigation(aId, cId), equals(NavigationResult.notDefined));
    });
  });

  group('Backward navigation', () {
    test('BACK allowed only when edge is defined', () {
      expect(nav.backwardNavigation(bId, aId), equals(NavigationResult.allowed));
      expect(nav.backwardNavigation(cId, bId), equals(NavigationResult.allowed));
    });

    test('BACK not defined when no previous edge', () {
      expect(nav.backwardNavigation(aId, bId), equals(NavigationResult.notDefined));
      expect(nav.backwardNavigation(aId, cId), equals(NavigationResult.notDefined));
    });
  });

  group('Jump navigation', () {
    test('JUMP allowed only when explicit edge exists', () {
      expect(nav.jumpNavigation(aId, bId), equals(NavigationResult.allowed));
      expect(nav.jumpNavigation(bId, cId), equals(NavigationResult.allowed));
    });

    test('JUMP not defined when no path', () {
      expect(nav.jumpNavigation(aId, cId), equals(NavigationResult.notDefined));
    });
  });

  group('Preview navigation', () {
    test('PREVIEW allowed when step exists in graph', () {
      expect(nav.previewNavigation(aId), equals(NavigationResult.allowed));
      expect(nav.previewNavigation(bId), equals(NavigationResult.allowed));
      expect(nav.previewNavigation(cId), equals(NavigationResult.allowed));
    });

    test('PREVIEW not defined for unknown step', () {
      expect(
        nav.previewNavigation(const FlowStepId('x')),
        equals(NavigationResult.notDefined),
      );
    });
  });

  group('Possible steps', () {
    test('possibleNextSteps and possiblePreviousSteps match graph', () {
      expect(nav.possibleNextSteps(aId), equals([bId]));
      expect(nav.possibleNextSteps(cId), isEmpty);
      expect(nav.possiblePreviousSteps(aId), isEmpty);
      expect(nav.possiblePreviousSteps(cId), equals([bId]));
    });
  });
}
