// Media Lifecycle — Declarative events. Describe transitions, don't execute them.

/// Events that can trigger lifecycle state transitions.
/// Declarative only; no side effects; no imperative actions.
enum MediaLifecycleEvent {
  /// Capture process completed; media ready for storage decision.
  captureCompleted,

  /// Local persistence completed.
  localPersisted,

  /// Upload to cloud started.
  syncStarted,

  /// Upload to cloud succeeded.
  uploadSucceeded,

  /// Upload to cloud failed (retry or fallback to local).
  uploadFailed,

  /// Archive to cold storage completed.
  archiveCompleted,

  /// Retention policy expired; media should be removed.
  retentionExpired,

  /// User requested deletion.
  userDeleted,

  /// Deletion completed.
  deletionCompleted,
}
