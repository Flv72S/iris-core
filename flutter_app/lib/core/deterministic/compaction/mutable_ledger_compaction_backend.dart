/// O10 — Backend that holds a mutable ledger and uses SnapshotManager for persist.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/compaction_backend.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_manager.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_metadata.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Backend with mutable ledger reference; uses [SnapshotManager] for createAndPersistSnapshot.
class MutableLedgerCompactionBackend<S extends DeterministicState>
    implements CompactionBackend<S> {
  MutableLedgerCompactionBackend({
    required DeterministicLedger<S> initialLedger,
    required SnapshotManager<S> snapshotManager,
    bool hasForkInWindow = false,
  })  : _ledger = initialLedger,
        _snapshotManager = snapshotManager,
        _hasForkInWindow = hasForkInWindow;

  DeterministicLedger<S> _ledger;
  final SnapshotManager<S> _snapshotManager;
  final bool _hasForkInWindow;

  @override
  DeterministicLedger<S> get ledger => _ledger;

  @override
  set ledger(DeterministicLedger<S> value) {
    _ledger = value;
  }

  @override
  SnapshotMetadata createAndPersistSnapshot(
    StateSnapshot<S> snapshot,
    int ledgerHeight,
  ) {
    return _snapshotManager.createSnapshot(snapshot, ledgerHeight);
  }

  @override
  bool get hasForkInWindow => _hasForkInWindow;
}
