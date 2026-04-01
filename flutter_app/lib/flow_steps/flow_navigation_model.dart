// F3 — UX navigation model. Describes possible navigation; does not execute it.

import 'flow_step_edge.dart';
import 'flow_step_graph.dart';
import 'flow_step_id.dart';
import 'flow_progression_rules.dart';

/// Kind of navigation action.
enum NavigationAction {
  next,
  back,
  jump,
  preview,
}

/// Result of evaluating whether a navigation is allowed (structural only).
enum NavigationResult {
  allowed,
  blocked,
  notDefined,
}

/// Describes possible navigation from a step. No execution; no runtime context.
class FlowNavigationModel {
  FlowNavigationModel({
    required this.graph,
    required this.rules,
  });

  final FlowStepGraph graph;
  final FlowProgressionRules rules;

  /// Whether NEXT from [fromStepId] to [toStepId] is defined and allowed.
  NavigationResult forwardNavigation(FlowStepId fromStepId, FlowStepId toStepId) {
    if (rules.isTerminal(fromStepId)) return NavigationResult.blocked;
    final nextSteps = graph.getNextSteps(fromStepId);
    if (!nextSteps.contains(toStepId)) return NavigationResult.notDefined;
    return NavigationResult.allowed;
  }

  /// Whether BACK from [fromStepId] to [toStepId] is defined and allowed.
  NavigationResult backwardNavigation(FlowStepId fromStepId, FlowStepId toStepId) {
    final prevSteps = graph.getPreviousSteps(fromStepId);
    if (!prevSteps.contains(toStepId)) return NavigationResult.notDefined;
    return NavigationResult.allowed;
  }

  /// Whether JUMP from [fromStepId] to [toStepId] is defined (explicit edge).
  NavigationResult jumpNavigation(FlowStepId fromStepId, FlowStepId toStepId) {
    final nextSteps = graph.getNextSteps(fromStepId);
    final prevSteps = graph.getPreviousSteps(toStepId);
    final hasForward = nextSteps.contains(toStepId);
    final hasBackEdge = prevSteps.contains(fromStepId);
    if (hasForward || hasBackEdge) return NavigationResult.allowed;
    return NavigationResult.notDefined;
  }

  /// Whether PREVIEW to [stepId] is possible (step exists in graph).
  NavigationResult previewNavigation(FlowStepId stepId) {
    if (graph.getStep(stepId) != null) return NavigationResult.allowed;
    return NavigationResult.notDefined;
  }

  /// All steps that can be reached by NEXT from [stepId].
  List<FlowStepId> possibleNextSteps(FlowStepId stepId) =>
      graph.getNextSteps(stepId);

  /// All steps that can be reached by BACK from [stepId].
  List<FlowStepId> possiblePreviousSteps(FlowStepId stepId) =>
      graph.getPreviousSteps(stepId);
}
