// ODA-2 — Tests: forward/backward sync, fork detection, continuity, snapshot, recovery, sync hash.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/cluster_state_snapshot.dart';
import 'package:iris_flutter_app/core/distributed/replication/deterministic_sync_hasher.dart';
import 'package:iris_flutter_app/core/distributed/replication/replication_integrity_report.dart';
import 'package:iris_flutter_app/core/distributed/replication/ledger_continuity_validator.dart';
import 'package:iris_flutter_app/core/distributed/replication/fork_boundary_detector.dart';
import 'package:iris_flutter_app/core/distributed/replication/replication_state_machine.dart';
import 'package:iris_flutter_app/core/distributed/replication/replication_session.dart';
import 'package:iris_flutter_app/core/distributed/replication/deterministic_delta_calculator.dart';
import 'package:iris_flutter_app/core/distributed/replication/snapshot_exchange_protocol.dart';
import 'package:iris_flutter_app/core/distributed/replication/sync_recovery_manager.dart';

void main() {
  group('ODA-2 DeterministicSyncHasher', () {
    test('same inputs produce same sync hash', () {
      final h1 = DeterministicSyncHasher.computeSyncHash(
        ledgerHeadHash: 'lh1',
        divergenceIndex: 0,
        membershipHash: 'm1',
      );
      final h2 = DeterministicSyncHasher.computeSyncHash(
        ledgerHeadHash: 'lh1',
        divergenceIndex: 0,
        membershipHash: 'm1',
      );
      expect(h1, h2);
    });
  });

  group('ODA-2 ReplicationIntegrityReport', () {
    test('syncHash is deterministic', () {
      const r = ReplicationIntegrityReport(
        peerId: 'p1',
        divergenceIndex: 1,
        eventsValidated: 10,
        eventsRejected: 0,
        forkDetected: false,
        membershipMismatch: false,
        finalSyncState: 'complete',
        ledgerHeadHash: 'lh',
        membershipHash: 'mh',
      );
      expect(r.syncHash, isNotEmpty);
      expect(r.syncHash, r.syncHash);
    });
  });

  group('ODA-2 LedgerContinuityValidator', () {
    test('validateEventBatch rejects broken chain', () {
      final validator = LedgerContinuityValidator();
      final events = [
        const LedgerEventRef(index: 0, eventHash: 'h0', previousHash: ''),
        const LedgerEventRef(index: 1, eventHash: 'h1', previousHash: 'wrong'),
      ];
      expect(validator.validateEventBatch(events), isFalse);
    });

    test('validateEventBatch accepts valid chain', () {
      final validator = LedgerContinuityValidator();
      final events = [
        const LedgerEventRef(index: 0, eventHash: 'h0', previousHash: ''),
        const LedgerEventRef(index: 1, eventHash: 'h1', previousHash: 'h0'),
      ];
      expect(validator.validateEventBatch(events), isTrue);
    });
  });

  group('ODA-2 ForkBoundaryDetector', () {
    test('detectFork finds divergence when hashes differ', () {
      final local = _StubLedger(height: 3, headHash: 'h3', hashes: ['h0', 'h1', 'h2', 'h3']);
      final report = ForkBoundaryDetector.detectFork(
        local,
        'other',
        (i) => i == 1 ? 'different' : local.getHashAt(i) ?? '',
        3,
      );
      expect(report.forkDetected, isTrue);
      expect(report.divergenceIndex, 1);
    });

    test('detectFork reports no fork when identical', () {
      final local = _StubLedger(height: 2, headHash: 'h2', hashes: ['h0', 'h1', 'h2']);
      final report = ForkBoundaryDetector.detectFork(
        local,
        'h2',
        (i) => local.getHashAt(i) ?? '',
        2,
      );
      expect(report.forkDetected, isFalse);
      expect(report.divergenceIndex, -1);
    });
  });

  group('ODA-2 ReplicationStateMachine', () {
    test('transition from init to snapshotCompare', () {
      final sm = ReplicationStateMachine();
      expect(sm.currentState, ReplicationState.init);
      sm.transition(ReplicationEvent.peerSnapshotReceived);
      expect(sm.currentState, ReplicationState.snapshotCompare);
    });

    test('transition to sessionAborted', () {
      final sm = ReplicationStateMachine();
      sm.transition(ReplicationEvent.abort);
      expect(sm.currentState, ReplicationState.sessionAborted);
    });
  });

  group('ODA-2 ReplicationSession', () {
    test('getSessionState is reconstructable', () {
      final session = ReplicationSession(peerNodeId: 'peer1');
      const snap = ClusterStateSnapshot(
        membershipHash: 'm',
        ledgerHeadHash: 'lh',
        projectionHash: 'ph',
        activeNodeCount: 2,
      );
      session.startSession(5, 7, snap);
      final state = session.getSessionState();
      expect(state.peerNodeId, 'peer1');
      expect(state.localLedgerHeight, 5);
      expect(state.peerLedgerHeight, 7);
    });
  });

  group('ODA-2 DeterministicDeltaCalculator', () {
    test('calculateIncomingDelta range', () {
      final range = DeterministicDeltaCalculator.calculateIncomingDelta(2, 5, 2);
      expect(range.startIndex, 2);
      expect(range.endIndex, 4);
    });
  });

  group('ODA-2 SnapshotExchangeProtocol', () {
    test('compareSnapshots incompatible when cluster hash differs', () {
      const local = ClusterStateSnapshot(
        membershipHash: 'm',
        ledgerHeadHash: 'lh',
        projectionHash: 'ph',
        activeNodeCount: 1,
      );
      const peer = ClusterStateSnapshot(
        membershipHash: 'm',
        ledgerHeadHash: 'lh2',
        projectionHash: 'ph',
        activeNodeCount: 1,
      );
      final r = SnapshotExchangeProtocol.compareSnapshots(local, peer, 'ch1', 'ch2');
      expect(r, SnapshotCompareResult.incompatibleCluster);
    });

    test('compareSnapshots alreadySynced when same head', () {
      const local = ClusterStateSnapshot(
        membershipHash: 'm',
        ledgerHeadHash: 'lh',
        projectionHash: 'ph',
        activeNodeCount: 1,
      );
      const peer = ClusterStateSnapshot(
        membershipHash: 'm',
        ledgerHeadHash: 'lh',
        projectionHash: 'ph',
        activeNodeCount: 1,
      );
      final r = SnapshotExchangeProtocol.compareSnapshots(local, peer, 'ch', 'ch');
      expect(r, SnapshotCompareResult.alreadySynced);
    });
  });

  group('ODA-2 SyncRecoveryManager', () {
    test('recoverIncompleteSync when no partial application', () {
      final mgr = SyncRecoveryManager(
        detectPartialApplication: () => false,
        rollbackIncompleteBatch: () => 0,
        revalidateHashChain: (_) => true,
      );
      final result = mgr.recoverIncompleteSync();
      expect(result.recovered, isTrue);
      expect(result.rollbackCount, 0);
    });
  });
}

class _StubLedger implements LedgerHashView {
  _StubLedger({required this.height, required this.headHash, required this.hashes});
  @override
  final int height;
  @override
  final String headHash;
  final List<String> hashes;

  @override
  String? getHashAt(int index) {
    if (index < 0 || index >= hashes.length) return null;
    return hashes[index];
  }
}
