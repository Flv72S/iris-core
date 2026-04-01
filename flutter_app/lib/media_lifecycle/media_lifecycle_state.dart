// Media Lifecycle — Logical state. No physical reference; no timestamp.

/// Represents the logical lifecycle state of a media asset.
/// Pure enum; no infrastructure dependency.
enum MediaLifecycleState {
  /// Media has been captured but not yet persisted.
  captured,

  /// Media is stored locally only; no cloud sync.
  localOnly,

  /// Media is being synchronized to cloud.
  syncing,

  /// Media is stored in cloud (active storage).
  cloudStored,

  /// Media has been moved to cold archive.
  coldArchived,

  /// Media is pending deletion (retention expired or user request).
  pendingDeletion,

  /// Media has been deleted.
  deleted,
}
