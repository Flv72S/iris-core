// F3 — Progression rules. Structural only; no conditions on data or Core.

import 'flow_step_id.dart';

/// Structural rules: which steps are mandatory, optional, repeatable, terminal.
class FlowProgressionRules {
  const FlowProgressionRules({
    this.mandatorySteps = const {},
    this.optionalSteps = const {},
    this.repeatableSteps = const {},
    this.terminalSteps = const {},
  });

  final Set<FlowStepId> mandatorySteps;
  final Set<FlowStepId> optionalSteps;
  final Set<FlowStepId> repeatableSteps;
  final Set<FlowStepId> terminalSteps;

  bool isMandatory(FlowStepId stepId) => mandatorySteps.contains(stepId);
  bool isOptional(FlowStepId stepId) => optionalSteps.contains(stepId);
  bool isRepeatable(FlowStepId stepId) => repeatableSteps.contains(stepId);
  bool isTerminal(FlowStepId stepId) => terminalSteps.contains(stepId);
}
