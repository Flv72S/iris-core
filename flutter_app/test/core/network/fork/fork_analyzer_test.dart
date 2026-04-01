import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_report.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';
import 'package:iris_flutter_app/core/network/divergence/deterministic_state_metadata.dart';
import 'package:iris_flutter_app/core/network/fork/fork_analyzer.dart';
import 'package:iris_flutter_app/core/network/fork/fork_analysis.dart';

const _v1 = DeterministicProtocolVersion.initial;

DeterministicStateMetadata meta({
  required String snapshotHash,
  required int ledgerHeight,
  List<int>? chainHashHistory,
}) {
  return DeterministicStateMetadata(
    snapshotHash: snapshotHash,
    ledgerHeight: ledgerHeight,
    protocolVersion: _v1,
    chainHashHistory: chainHashHistory ?? List.generate(ledgerHeight, (i) => 100 + i),
  );
}

void main() {
  late ForkAnalyzer analyzer;

  setUp(() {
    analyzer = ForkAnalyzer();
  });

  group('ForkAnalyzer', () {
    test('returns null when not fork', () {
      final div = DivergenceReport(
        type: DivergenceType.inSync,
        localSnapshotHash: 'h',
        remoteSnapshotHash: 'h',
        localLedgerHeight: 3,
        remoteLedgerHeight: 3,
      );
      final local = meta(snapshotHash: 'h', ledgerHeight: 3);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 3);
      final a = analyzer.analyze(divergence: div, localState: local, remoteState: remote);
      expect(a, isNull);
    });

    test('returns null when commonAncestorHeight missing', () {
      final div = DivergenceReport(
        type: DivergenceType.forkDetected,
        localSnapshotHash: 'l',
        remoteSnapshotHash: 'r',
        localLedgerHeight: 4,
        remoteLedgerHeight: 4,
        commonAncestorHeight: null,
      );
      final local = meta(snapshotHash: 'l', ledgerHeight: 4);
      final remote = meta(snapshotHash: 'r', ledgerHeight: 4);
      final a = analyzer.analyze(divergence: div, localState: local, remoteState: remote);
      expect(a, isNull);
    });

    test('extracts both branches deterministically', () {
      final div = DivergenceReport(
        type: DivergenceType.forkDetected,
        localSnapshotHash: 'localTip',
        remoteSnapshotHash: 'remoteTip',
        localLedgerHeight: 4,
        remoteLedgerHeight: 5,
        commonAncestorHeight: 2,
      );
      final local = meta(
        snapshotHash: 'localTip',
        ledgerHeight: 4,
        chainHashHistory: [10, 11, 20, 21],
      );
      final remote = meta(
        snapshotHash: 'remoteTip',
        ledgerHeight: 5,
        chainHashHistory: [10, 11, 30, 31, 32],
      );
      final a = analyzer.analyze(divergence: div, localState: local, remoteState: remote);
      expect(a, isNotNull);
      expect(a!.commonAncestorHeight, 2);
      expect(a.localBranch.branchId, 'local');
      expect(a.localBranch.startingHeight, 2);
      expect(a.localBranch.eventHashes, ['14', '15']); // 20->14, 21->15 in hex
      expect(a.localBranch.finalSnapshotHash, 'localTip');
      expect(a.remoteBranch.branchId, 'remote');
      expect(a.remoteBranch.startingHeight, 2);
      expect(a.remoteBranch.eventHashes.length, 3);
      expect(a.remoteBranch.finalSnapshotHash, 'remoteTip');
    });

    test('fork at genesis: ancestor 0', () {
      final div = DivergenceReport(
        type: DivergenceType.forkDetected,
        localSnapshotHash: 'l',
        remoteSnapshotHash: 'r',
        localLedgerHeight: 2,
        remoteLedgerHeight: 2,
        commonAncestorHeight: 0,
      );
      final local = meta(
        snapshotHash: 'l',
        ledgerHeight: 2,
        chainHashHistory: [1, 2],
      );
      final remote = meta(
        snapshotHash: 'r',
        ledgerHeight: 2,
        chainHashHistory: [5, 6],
      );
      final a = analyzer.analyze(divergence: div, localState: local, remoteState: remote);
      expect(a, isNotNull);
      expect(a!.commonAncestorHeight, 0);
      expect(a.localBranch.startingHeight, 0);
      expect(a.localBranch.eventHashes, ['1', '2']);
      expect(a.remoteBranch.eventHashes, ['5', '6']);
    });
  });
}
