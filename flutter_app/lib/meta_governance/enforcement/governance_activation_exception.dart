// H5 - Activation exceptions. Typed; no logic.

class InvalidRatificationException implements Exception {
  InvalidRatificationException(this.message);
  final String message;
  @override
  String toString() => 'InvalidRatificationException: $message';
}

class GovernanceDowngradeAttemptException implements Exception {
  GovernanceDowngradeAttemptException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceDowngradeAttemptException: $message';
}

class GovernanceVersionConflictException implements Exception {
  GovernanceVersionConflictException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceVersionConflictException: $message';
}
