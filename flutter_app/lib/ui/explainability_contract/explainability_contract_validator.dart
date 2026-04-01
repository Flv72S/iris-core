// Phase 11.3.1 — Deterministic validator. No logic, formal checks only.

import 'explainability_validation_result.dart';
import 'explainability_view_model.dart';

/// Validates explainability ViewModel structure. No interpretation.
ExplainabilityValidationResult validateExplainabilityViewModel(
  ExplainabilityViewModel vm,
) {
  final errors = <String>[];
  if (vm.traceId.isEmpty) errors.add('traceId empty');
  if (vm.state.isEmpty) errors.add('state empty');
  if (vm.resolution.isEmpty) errors.add('resolution empty');
  if (vm.outcomeStatus.isEmpty) errors.add('outcomeStatus empty');
  if (vm.explanationTitle.isEmpty) errors.add('explanationTitle empty');
  if (vm.explanationSummary.isEmpty) errors.add('explanationSummary empty');
  if (vm.explanationDetails.isEmpty) errors.add('explanationDetails empty');
  if (vm.safetyLevel.isEmpty) errors.add('safetyLevel empty');
  if (vm.timestamp.isEmpty) errors.add('timestamp empty');
  return ExplainabilityValidationResult(
    isValid: errors.isEmpty,
    errors: List<String>.from(errors),
  );
}
