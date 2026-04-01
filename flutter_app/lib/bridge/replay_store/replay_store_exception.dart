// Phase 11.2.4 — Typed exception. Deterministic messages, no timestamp.

/// Thrown when store operation is invalid (invalid trace, duplicate inconsistent, etc.).
class ReplayStoreException implements Exception {
  const ReplayStoreException(this.message);

  final String message;

  @override
  String toString() => 'ReplayStoreException: $message';
}
