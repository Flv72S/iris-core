// F3 — Step graph. Directed; deterministic; no selection logic.

import 'flow_step.dart';
import 'flow_step_edge.dart';
import 'flow_step_id.dart';

/// Directed graph of steps. Single initial node; deterministic traversal.
class FlowStepGraph {
  FlowStepGraph({
    required this.steps,
    required this.initialStepId,
    required this.edges,
  })  : _stepById = {for (final s in steps) s.stepId: s},
        _nextByStep = _buildNextMap(edges),
        _prevByStep = _buildPrevMap(edges);

  final List<FlowStep> steps;
  final FlowStepId initialStepId;
  final List<FlowStepEdge> edges;

  final Map<FlowStepId, FlowStep> _stepById;
  final Map<FlowStepId, List<FlowStepId>> _nextByStep;
  final Map<FlowStepId, List<FlowStepId>> _prevByStep;

  static Map<FlowStepId, List<FlowStepId>> _buildNextMap(List<FlowStepEdge> edges) {
    final map = <FlowStepId, List<FlowStepId>>{};
    for (final e in edges) {
      map.putIfAbsent(e.from, () => []).add(e.to);
    }
    return map;
  }

  static Map<FlowStepId, List<FlowStepId>> _buildPrevMap(List<FlowStepEdge> edges) {
    final map = <FlowStepId, List<FlowStepId>>{};
    for (final e in edges) {
      map.putIfAbsent(e.to, () => []).add(e.from);
    }
    return map;
  }

  /// Initial step. Throws if not in steps.
  FlowStep getInitialStep() {
    final step = _stepById[initialStepId];
    if (step == null) throw StateError('Initial step $initialStepId not in graph');
    return step;
  }

  /// Next steps from [stepId]. Empty if none. No selection logic.
  List<FlowStepId> getNextSteps(FlowStepId stepId) {
    return List.unmodifiable(_nextByStep[stepId] ?? []);
  }

  /// Previous steps from [stepId]. Empty if none.
  List<FlowStepId> getPreviousSteps(FlowStepId stepId) {
    return List.unmodifiable(_prevByStep[stepId] ?? []);
  }

  /// Step by id. Null if not in graph.
  FlowStep? getStep(FlowStepId stepId) => _stepById[stepId];

  /// All step ids in the graph.
  Set<FlowStepId> get stepIds => _stepById.keys.toSet();
}
