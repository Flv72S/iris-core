// I6 - Failure type enum. Stable order; deterministic; no runtime dependencies.

/// Enumerates all possible failure types in the media execution pipeline.
/// Order is stable and deterministic for consistent hashing and comparison.
enum FailureType {
  /// Input constraint check failed (e.g., malformed hash format, missing required field)
  validationError,

  /// Policy constraint violated (e.g., file too large, tier not allowed)
  policyViolation,

  /// Storage backend unavailable (device or cloud)
  storageUnavailable,

  /// Network communication error (for cloud operations)
  networkError,

  /// Execution threw an exception
  executionException,

  /// Operation timed out (logical timeout, not clock-based)
  timeout,

  /// Unknown or unclassified error
  unknown,
}

/// Extension providing utility methods for FailureType.
extension FailureTypeExtension on FailureType {
  /// Returns true if this failure type is potentially recoverable.
  bool get isRecoverable {
    switch (this) {
      case FailureType.storageUnavailable:
      case FailureType.networkError:
      case FailureType.timeout:
        return true;
      case FailureType.validationError:
      case FailureType.policyViolation:
      case FailureType.executionException:
      case FailureType.unknown:
        return false;
    }
  }

  /// Returns a stable string code for serialization.
  String get code => name;
}
