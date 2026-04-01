// L4 — Result of validation. Immutable; errors list unmodifiable.

import 'package:iris_flutter_app/flow/application/validation/validation_error.dart';

/// Result of validating a signed operation request. Errors in deterministic order.
class ValidationResult {
  const ValidationResult({
    required this.isValid,
    required this.errors,
  });

  final bool isValid;
  final List<ValidationError> errors;

  factory ValidationResult.valid() =>
      const ValidationResult(isValid: true, errors: []);

  factory ValidationResult.invalid(List<ValidationError> errors) =>
      ValidationResult(
        isValid: false,
        errors: List<ValidationError>.unmodifiable(errors),
      );
}
