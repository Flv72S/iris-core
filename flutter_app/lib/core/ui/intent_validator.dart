/// OX4 — Deterministic intent validation. Uses projection state only; no async.

import 'package:iris_flutter_app/core/ui/ui_intent.dart';

class ValidationResult {
  const ValidationResult._({this.valid = false, this.message = ''});
  const ValidationResult.valid() : this._(valid: true);
  const ValidationResult.invalid(String message) : this._(valid: false, message: message);

  final bool valid;
  final String message;
}

/// Validates intents before dispatch. Deterministic; uses projection state only.
abstract class IntentValidator {
  ValidationResult validate(UIIntent intent, ValidationContext context);
}

/// Read-only context for validation (e.g. current projection state).
class ValidationContext {
  const ValidationContext({this.projectionStateById = const {}});
  final Map<String, Object?> projectionStateById;

  Object? getProjectionState(String projectionId) => projectionStateById[projectionId];
}
