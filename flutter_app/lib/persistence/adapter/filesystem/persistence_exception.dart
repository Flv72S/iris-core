// J4 — PersistenceException. IO errors; no silent catch.

/// Thrown when persistence IO fails.
class PersistenceException implements Exception {
  PersistenceException(this.message, [this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => cause != null
      ? 'PersistenceException: $message ($cause)'
      : 'PersistenceException: $message';
}
