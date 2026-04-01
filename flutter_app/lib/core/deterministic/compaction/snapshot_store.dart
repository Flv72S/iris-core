/// O10 — Persistence for snapshot metadata and optional payload. Append/load only.

import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_metadata.dart';

/// Stores snapshot metadata (and optionally snapshot data). No update or delete.
abstract interface class SnapshotStore {
  /// Save metadata. Overwrites any existing snapshot for same height (single latest snapshot).
  void save(SnapshotMetadata metadata);

  /// Load latest saved metadata, or null.
  SnapshotMetadata? load();
}
