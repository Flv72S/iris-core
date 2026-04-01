/// O8 — Result of fork resolution. Explicit and auditable.

/// Outcome of a fork resolution attempt.
enum ForkResolutionStatus {
  /// Local branch kept (PREFER_LOCAL applied).
  resolvedLocal,

  /// Remote branch validated and applied (PREFER_REMOTE applied).
  resolvedRemote,

  /// Resolution deferred (e.g. MANUAL_SELECTION).
  deferred,

  /// Resolution rejected (strategy REJECT or validation failed).
  rejected,
}

/// Result of [ForkResolutionEngine.resolve].
class ForkResolutionResult {
  const ForkResolutionResult({
    required this.status,
    required this.message,
    this.appliedBranchId,
  });

  final ForkResolutionStatus status;
  final String message;

  /// Set when [ForkResolutionStatus.resolvedRemote] or [resolvedLocal]: branch that was applied/kept.
  final String? appliedBranchId;

  @override
  String toString() =>
      'ForkResolutionResult(${status.name}, "$message", appliedBranchId=$appliedBranchId)';
}
