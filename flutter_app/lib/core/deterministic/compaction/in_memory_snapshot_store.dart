/// O10 — In-memory snapshot store for tests.

import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_metadata.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_store.dart';

class InMemorySnapshotStore implements SnapshotStore {
  SnapshotMetadata? _metadata;

  @override
  void save(SnapshotMetadata metadata) {
    _metadata = metadata;
  }

  @override
  SnapshotMetadata? load() => _metadata;
}
