// F4 — Transition result. Technical only; no normative interpretation.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_steps/flow_navigation_model.dart';

/// Result of a transition attempt. Immutable.
class FlowTransitionResult {
  const FlowTransitionResult({
    required this.newState,
    required this.navigationResult,
    this.message = '',
  });

  final FlowRuntimeState newState;
  final NavigationResult navigationResult;
  /// Technical message; not UX copy.
  final String message;

  bool get isSuccess => navigationResult == NavigationResult.allowed;
}
