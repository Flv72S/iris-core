/// O10 — Deterministic ledger compaction. Transactional; preserves fork window and replay integrity.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/compaction_backend.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/compaction_policy.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/compaction_result.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_manager.dart';
import 'package:iris_flutter_app/core/deterministic/compaction/snapshot_metadata.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Compacts ledger by creating a snapshot at the cut point and pruning older events.
/// Preserves fork window and recent events; transactional (all or nothing).
class LedgerCompactor<S extends DeterministicState> {
  LedgerCompactor({
    required CompactionBackend<S> backend,
    required SnapshotManager<S> snapshotManager,
  })  : _backend = backend,
        _snapshotManager = snapshotManager;

  final CompactionBackend<S> _backend;
  final SnapshotManager<S> _snapshotManager;

  /// Run compaction per [policy]. Returns result; on failure ledger is unchanged.
  CompactionResult compact(CompactionPolicy policy) {
    final ledger = _backend.ledger;
    final length = ledger.length;

    if (length < policy.minEventsBeforeCompaction) {
      return CompactionResult(
        success: false,
        message: 'Ledger length $length below min ${policy.minEventsBeforeCompaction}',
      );
    }

    final keepCount = _keepCount(policy);
    final cutIndex = length - keepCount;

    if (cutIndex <= 0) {
      return CompactionResult(
        success: false,
        message: 'No prunable range (keepCount=$keepCount >= length=$length)',
      );
    }

    if (_backend.hasForkInWindow) {
      return CompactionResult(
        success: false,
        message: 'Fork exists inside preserve window; compaction aborted',
      );
    }

    final baseSnapshot = ledger.getSnapshotAt(cutIndex - 1);
    if (baseSnapshot == null) {
      return CompactionResult(
        success: false,
        message: 'Missing snapshot at cut index ${cutIndex - 1}',
      );
    }

    SnapshotMetadata metadata;
    try {
      metadata = _backend.createAndPersistSnapshot(baseSnapshot, cutIndex);
    } catch (e) {
      return CompactionResult(
        success: false,
        message: 'Failed to persist snapshot: $e',
      );
    }

    final loaded = _snapshotManager.loadSnapshot();
    if (loaded == null || !_snapshotManager.validateSnapshot(loaded, baseSnapshot)) {
      return CompactionResult(
        success: false,
        message: 'Snapshot validation failed after persist',
      );
    }

    try {
      final newSnapshots = _buildReindexedSnapshots(ledger, cutIndex, keepCount);
      final newLedger = DeterministicLedger<S>.fromSnapshotListForTest(newSnapshots);
      if (!newLedger.verifyFullChain()) {
        return CompactionResult(
          success: false,
          message: 'Compacted ledger chain verification failed',
        );
      }
      _backend.ledger = newLedger;
    } catch (e) {
      return CompactionResult(
        success: false,
        message: 'Failed to replace ledger (rollback): $e',
      );
    }

    return CompactionResult(
      success: true,
      message: 'Compaction completed',
      previousLedgerSize: length,
      newLedgerSize: keepCount,
      prunedEventsCount: cutIndex,
      newSnapshotHash: metadata.snapshotHash,
    );
  }

  int _keepCount(CompactionPolicy policy) {
    final a = policy.preserveRecentEvents;
    final b = policy.preserveForkWindow;
    return a > b ? a : b;
  }

  List<StateSnapshot<S>> _buildReindexedSnapshots(
    DeterministicLedger<S> ledger,
    int cutIndex,
    int keepCount,
  ) {
    final result = <StateSnapshot<S>>[];
    int previousChainHash = SnapshotChainHasher.genesisChainHash;

    for (var i = 0; i < keepCount; i++) {
      final oldSnapshot = ledger.getSnapshotAt(cutIndex + i)!;
      final transitionIndex = i;
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previousChainHash,
        stateHash: oldSnapshot.stateHash,
        stateVersion: oldSnapshot.stateVersion,
        transitionIndex: transitionIndex,
        protocolVersion: oldSnapshot.protocolVersion,
      );
      final newSnapshot = StateSnapshot<S>.fromState(
        state: oldSnapshot.state,
        transitionIndex: transitionIndex,
        chainHash: chainHash,
        protocolVersion: oldSnapshot.protocolVersion,
      );
      result.add(newSnapshot);
      previousChainHash = chainHash;
    }
    return result;
  }
}
