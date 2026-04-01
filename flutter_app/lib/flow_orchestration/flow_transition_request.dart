// F4 — Transition request. Immutable command; no logic.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_steps/flow_navigation_model.dart';

/// Request to perform a navigation transition. Pure data.
class FlowTransitionRequest {
  const FlowTransitionRequest({
    required this.currentState,
    required this.action,
    this.targetStepId,
  });

  final FlowRuntimeState currentState;
  final NavigationAction action;
  /// Required for [NavigationAction.jump]; optional otherwise.
  final FlowStepId? targetStepId;
}
