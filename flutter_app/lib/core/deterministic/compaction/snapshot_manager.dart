/// O10 — Create, persist, and validate canonical snapshots. Deterministic hashes.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_metadata.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_store.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Generates canonical snapshots, computes deterministic hash, persists via store.
class SnapshotManager<S extends DeterministicState> {
  SnapshotManager({required SnapshotStore store}) : _store = store;

  final SnapshotStore _store;

  /// Create metadata from [snapshot] at [ledgerHeight], persist, and return metadata.
  /// [previousSnapshotHash] is optional (use 'genesis' when absent). [createdAt] is informational only.
  SnapshotMetadata createSnapshot(
    StateSnapshot<S> snapshot,
    int ledgerHeight, {
    String previousSnapshotHash = 'genesis',
    String? createdAt,
  }) {
    final snapshotHash = snapshot.chainHash.toRadixString(16);
    final metadata = SnapshotMetadata(
      snapshotHash: snapshotHash,
      ledgerHeight: ledgerHeight,
      stateHash: snapshot.stateHash,
      previousSnapshotHash: previousSnapshotHash,
      createdAt: createdAt ?? _createdAt(),
    );
    _store.save(metadata);
    return metadata;
  }

  /// Load the latest persisted snapshot metadata, or null.
  SnapshotMetadata? loadSnapshot() => _store.load();

  /// Validate [metadata] against [snapshot]: hash and stateHash must match.
  bool validateSnapshot(SnapshotMetadata metadata, StateSnapshot<S> snapshot) {
    if (snapshot.stateHash != metadata.stateHash) return false;
    final computedHash = snapshot.chainHash.toRadixString(16);
    return computedHash == metadata.snapshotHash;
  }

  /// Informational only; not used for decision logic.
  static String _createdAt() =>
      DateTime.now().toUtc().toIso8601String(); // ignore: avoid_redundant_parameter
}
