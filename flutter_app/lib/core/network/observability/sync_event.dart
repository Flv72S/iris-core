/// O9 — Structured sync event. Immutable; machine-readable.

/// Sync lifecycle and audit event types.
enum SyncEventType {
  syncStarted,
  syncCompleted,
  syncFailed,
  divergenceDetected,
  reconciliationAttempted,
  reconciliationResult,
  forkAnalyzed,
  forkResolutionAttempted,
  forkResolutionResult,
  deferredOperationEnqueued,
  deferredOperationRetry,
}

/// Single sync event. [payload] must be immutable; [createdAt] is informational only.
class SyncEvent {
  const SyncEvent({
    required this.id,
    required this.type,
    required this.correlationId,
    required this.payload,
    required this.createdAt,
  });

  /// UUID v4.
  final String id;

  final SyncEventType type;
  final String correlationId;

  /// Immutable map (canonical-serializable). Never used for decision logic.
  final Map<String, dynamic> payload;

  /// Informational only (e.g. ISO 8601). Never used for decision logic.
  final String createdAt;
}
