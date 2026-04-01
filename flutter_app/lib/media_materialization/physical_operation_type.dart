// Media Materialization — Physical operation types. Pure enum; no provider reference.

/// Types of physical operations that can be performed on media.
/// Provider-agnostic; no technology-specific references.
enum PhysicalOperationType {
  /// Store media on local device storage.
  storeLocal,

  /// Upload media to cloud storage.
  uploadCloud,

  /// Archive media to cold storage.
  archiveCold,

  /// Delete media from storage.
  delete,
}
