// F4 — Validates transition against step graph and rules. Structure only.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_steps/flow_navigation_model.dart';
import 'package:iris_flutter_app/flow_steps/flow_step_id.dart' as steps;
import 'flow_transition_request.dart';

/// Validates if a transition is permitted. No Core, no user data, no real time.
class FlowTransitionValidator {
  FlowTransitionValidator({required this.navigationModel});

  final FlowNavigationModel navigationModel;

  static steps.FlowStepId _toStepsStepId(FlowStepId id) =>
      steps.FlowStepId(id.value);

  NavigationResult validate(FlowTransitionRequest request) {
    final current = request.currentState.sessionContext.activeStep ??
        request.currentState.orchestrationState.currentStep;
    if (current == null) return NavigationResult.notDefined;
    final currentSteps = _toStepsStepId(current);

    switch (request.action) {
      case NavigationAction.next:
        if (navigationModel.rules.isTerminal(currentSteps)) {
          return NavigationResult.blocked;
        }
        final nextSteps = navigationModel.possibleNextSteps(currentSteps);
        if (nextSteps.isEmpty) return NavigationResult.notDefined;
        return navigationModel.forwardNavigation(
            currentSteps, nextSteps.first);
      case NavigationAction.back:
        final prevSteps = navigationModel.possiblePreviousSteps(currentSteps);
        if (prevSteps.isEmpty) return NavigationResult.notDefined;
        return navigationModel.backwardNavigation(
            currentSteps, prevSteps.first);
      case NavigationAction.jump:
        final target = request.targetStepId;
        if (target == null) return NavigationResult.notDefined;
        if (navigationModel.graph.getStep(_toStepsStepId(target)) == null) {
          return NavigationResult.notDefined;
        }
        return navigationModel.jumpNavigation(
            currentSteps, _toStepsStepId(target));
      case NavigationAction.preview:
        final target = request.targetStepId;
        if (target == null) return NavigationResult.notDefined;
        return navigationModel.previewNavigation(_toStepsStepId(target));
    }
  }

  FlowStepId? resolveNextTarget(FlowTransitionRequest request) {
    final current = request.currentState.sessionContext.activeStep ??
        request.currentState.orchestrationState.currentStep;
    if (current == null) return null;
    final nextSteps = navigationModel
        .possibleNextSteps(_toStepsStepId(current));
    if (nextSteps.length != 1) return null;
    return FlowStepId(nextSteps.single.value);
  }

  FlowStepId? resolveBackTarget(FlowTransitionRequest request) {
    final current = request.currentState.sessionContext.activeStep ??
        request.currentState.orchestrationState.currentStep;
    if (current == null) return null;
    final prevSteps = navigationModel
        .possiblePreviousSteps(_toStepsStepId(current));
    if (prevSteps.length != 1) return null;
    return FlowStepId(prevSteps.single.value);
  }
}
