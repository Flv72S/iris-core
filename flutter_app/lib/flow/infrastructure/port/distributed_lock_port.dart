// K1 — DistributedLockPort. Contract only; no implementation.

/// Port for distributed lock coordination.
/// Does not affect Core determinism; lock is external coordination only.
/// Implementations are provided in later microsteps (e.g. K4).
abstract interface class DistributedLockPort {
  /// Acquires lock for [lockKey]; blocks until acquired.
  Future<void> acquireLock(String lockKey);

  /// Releases lock for [lockKey].
  Future<void> releaseLock(String lockKey);

  /// Tries to acquire lock for [lockKey] within [timeout].
  /// Returns true if acquired, false otherwise.
  Future<bool> tryAcquireLock(String lockKey, Duration timeout);
}
