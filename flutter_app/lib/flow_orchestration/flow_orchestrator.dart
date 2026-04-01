// F4 — Orchestration engine. Pure transitions; delegates to validator.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_steps/flow_navigation_model.dart';
import 'flow_transition_request.dart';
import 'flow_transition_result.dart';
import 'flow_transition_validator.dart';

/// Handles transitions by validating and applying. Pure; no side effects; no async.
class FlowOrchestrator {
  FlowOrchestrator({
    required this.navigationModel,
    required this.clock,
  }) : _validator = FlowTransitionValidator(navigationModel: navigationModel);

  final FlowNavigationModel navigationModel;
  final FlowClock clock;
  final FlowTransitionValidator _validator;

  /// Processes [request]. Returns new state and result; never mutates [request.currentState].
  FlowTransitionResult handleTransition(FlowTransitionRequest request) {
    final result = _validator.validate(request);
    if (result != NavigationResult.allowed) {
      return FlowTransitionResult(
        newState: request.currentState,
        navigationResult: result,
        message: _messageFor(result),
      );
    }
    final newState = _applyTransition(request);
    return FlowTransitionResult(
      newState: newState,
      navigationResult: NavigationResult.allowed,
      message: 'ok',
    );
  }

  String _messageFor(NavigationResult r) {
    switch (r) {
      case NavigationResult.allowed:
        return 'ok';
      case NavigationResult.blocked:
        return 'blocked';
      case NavigationResult.notDefined:
        return 'not_defined';
    }
  }

  FlowRuntimeState _applyTransition(FlowTransitionRequest request) {
    final current = request.currentState.sessionContext.activeStep ??
        request.currentState.orchestrationState.currentStep;

    switch (request.action) {
      case NavigationAction.next:
        final target = _validator.resolveNextTarget(request);
        if (target == null) return request.currentState;
        return request.currentState.moveToStep(target, clock);
      case NavigationAction.back:
        final target = _validator.resolveBackTarget(request);
        if (target == null) return request.currentState;
        return request.currentState.moveToStep(target, clock);
      case NavigationAction.jump:
        final target = request.targetStepId;
        if (target == null) return request.currentState;
        return request.currentState.moveToStep(target, clock);
      case NavigationAction.preview:
        return request.currentState;
    }
  }

  /// Convenience: NEXT from [state]. Delegates to validator.
  FlowTransitionResult moveNext(FlowRuntimeState state) =>
      handleTransition(FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.next,
      ));

  /// Convenience: BACK from [state]. Delegates to validator.
  FlowTransitionResult moveBack(FlowRuntimeState state) =>
      handleTransition(FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.back,
      ));

  /// Convenience: JUMP to [stepId] from [state]. Delegates to validator.
  FlowTransitionResult jumpTo(FlowRuntimeState state, FlowStepId stepId) =>
      handleTransition(FlowTransitionRequest(
        currentState: state,
        action: NavigationAction.jump,
        targetStepId: stepId,
      ));
}
