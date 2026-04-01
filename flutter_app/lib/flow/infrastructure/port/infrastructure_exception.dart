// K1 — InfrastructureException. Base and optional subtypes; no external dependency.

/// Base exception for infrastructure layer failures.
class InfrastructureException implements Exception {
  InfrastructureException([this.message, this.cause]);

  final String? message;
  final Object? cause;

  @override
  String toString() =>
      'InfrastructureException: ${message ?? 'Unknown'}${cause != null ? ' ($cause)' : ''}';
}

/// Thrown when storage operations fail.
class StorageException extends InfrastructureException {
  StorageException([super.message, super.cause]);
}

/// Thrown when lock acquire/release fails.
class LockException extends InfrastructureException {
  LockException([super.message, super.cause]);
}

/// Thrown when retry policy exhausts without success.
class RetryException extends InfrastructureException {
  RetryException([super.message, super.cause]);
}

/// Thrown when node identity cannot be obtained.
class NodeIdentityException extends InfrastructureException {
  NodeIdentityException([super.message, super.cause]);
}
