// F3 — Step edges. Structural only; edgeType is not a condition.

import 'flow_step_id.dart';

/// Edge type: structural information only.
enum FlowEdgeType {
  forward,
  backward,
  optional,
}

/// Directed connection between two steps.
class FlowStepEdge {
  const FlowStepEdge({
    required this.from,
    required this.to,
    this.edgeType = FlowEdgeType.forward,
  });

  final FlowStepId from;
  final FlowStepId to;
  final FlowEdgeType edgeType;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowStepEdge &&
          from == other.from &&
          to == other.to &&
          edgeType == other.edgeType);

  @override
  int get hashCode => Object.hash(from, to, edgeType);
}
