/// O7 — Reconciliation outcome. Explicit and traceable; no silent overwrite.

/// Result status of a reconciliation step.
enum ReconciliationStatus {
  /// No divergence or already in sync.
  noAction,

  /// REMOTE_AHEAD: caller should request remote segment and replay (then call again with [ReplayOutcome]).
  needRemoteReplay,

  /// Remote segment was replayed and validated successfully.
  appliedRemoteSegment,

  /// Local segment was sent to remote.
  sentLocalSegment,

  /// Fork detected; handling deferred (no automatic merge).
  forkDeferred,

  /// Reconciliation refused (replay failed, snapshot mismatch, or protocol incompatible).
  rejected,
}

/// Result of a reconciliation decision or step.
class ReconciliationResult {
  const ReconciliationResult({
    required this.status,
    required this.message,
    this.appliedSegments,
  });

  final ReconciliationStatus status;
  final String message;

  /// Set when [ReconciliationStatus.appliedRemoteSegment]: number of segments applied.
  final int? appliedSegments;

  @override
  String toString() =>
      'ReconciliationResult(${status.name}, "$message", appliedSegments=$appliedSegments)';
}
