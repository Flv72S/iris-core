// K1 — RetryPolicyPort. Contract only; no implementation.

/// Port for retry-wrapped operations.
/// Does not modify input or generate timestamp; retry is transparent to Core.
abstract interface class RetryPolicyPort {
  /// Executes [operation] with retry policy. Returns the result of [operation].
  /// Does not alter content or input of the operation.
  T executeWithRetry<T>(T Function() operation);
}
