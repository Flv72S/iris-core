// F4 — Orchestration exceptions. Technical only; no domain semantics.

/// Transition is structurally invalid.
class InvalidTransitionException implements Exception {
  InvalidTransitionException([this.message]);
  final String? message;
  @override
  String toString() => 'InvalidTransitionException: ${message ?? 'invalid transition'}';
}

/// Step not found in graph.
class StepNotFoundException implements Exception {
  StepNotFoundException([this.stepId, this.message]);
  final String? stepId;
  final String? message;
  @override
  String toString() =>
      'StepNotFoundException: ${stepId ?? 'unknown'} ${message ?? ''}'.trim();
}

/// Navigation action not allowed by structure.
class NavigationNotAllowedException implements Exception {
  NavigationNotAllowedException([this.message]);
  final String? message;
  @override
  String toString() =>
      'NavigationNotAllowedException: ${message ?? 'not allowed'}';
}
