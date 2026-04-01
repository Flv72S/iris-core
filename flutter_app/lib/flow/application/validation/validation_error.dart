// L4 — Validation error. Immutable; no logic, no exception mapping.

/// Single validation failure. Immutable value; no behavior.
class ValidationError {
  const ValidationError({
    required this.code,
    required this.message,
  });

  final String code;
  final String message;
}
