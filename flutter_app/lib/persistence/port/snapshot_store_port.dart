// J1 — SnapshotStorePort. Pure contract.

import 'package:iris_flutter_app/persistence/persisted_types.dart';

abstract interface class SnapshotStorePort {
  Future<void> saveSnapshot(PersistedGovernanceSnapshot snapshot);
  Future<PersistedGovernanceSnapshot?> getSnapshot(String executionId);
  Future<bool> exists(String executionId);
  Future<void> delete(String executionId);
}
