/// O10 — Backend for compaction: ledger access, snapshot persist, ledger replace.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_metadata.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Backend used by [LedgerCompactor] to access ledger, persist snapshot, and replace ledger.
abstract interface class CompactionBackend<S extends DeterministicState> {
  /// Current ledger. Compactor may replace with compacted ledger.
  DeterministicLedger<S> get ledger;
  set ledger(DeterministicLedger<S> value);

  /// Persist snapshot at given height; return metadata.
  SnapshotMetadata createAndPersistSnapshot(StateSnapshot<S> snapshot, int ledgerHeight);

  /// Return true if a fork is known to exist inside the preserve window (compaction must abort).
  bool get hasForkInWindow;
}
