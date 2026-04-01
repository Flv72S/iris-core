import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_detector.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_report.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';
import 'package:iris_flutter_app/core/network/divergence/deterministic_state_metadata.dart';

const _v1 = DeterministicProtocolVersion.initial;
final _v2 = DeterministicProtocolVersion(major: 2, minor: 0);

DeterministicStateMetadata meta({
  required String snapshotHash,
  required int ledgerHeight,
  DeterministicProtocolVersion? protocolVersion,
  List<int>? chainHashHistory,
}) {
  return DeterministicStateMetadata(
    snapshotHash: snapshotHash,
    ledgerHeight: ledgerHeight,
    protocolVersion: protocolVersion ?? _v1,
    chainHashHistory: chainHashHistory ?? List.generate(ledgerHeight, (i) => 100 + i),
  );
}

void main() {
  late DivergenceDetector detector;

  setUp(() {
    detector = DivergenceDetector();
  });

  group('DivergenceDetector', () {
    test('Identical states → IN_SYNC', () {
      final local = meta(snapshotHash: 'abc', ledgerHeight: 3, chainHashHistory: [10, 11, 12]);
      final remote = meta(snapshotHash: 'abc', ledgerHeight: 3, chainHashHistory: [10, 11, 12]);
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.inSync);
      expect(report.localLedgerHeight, 3);
      expect(report.remoteLedgerHeight, 3);
      expect(report.commonAncestorHeight, isNull);
    });

    test('Remote ahead: same hash, remote height > local', () {
      final local = meta(snapshotHash: 'x', ledgerHeight: 2, chainHashHistory: [10, 11]);
      final remote = meta(snapshotHash: 'x', ledgerHeight: 5, chainHashHistory: [10, 11, 12, 13, 14]);
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.remoteAhead);
      expect(report.localLedgerHeight, 2);
      expect(report.remoteLedgerHeight, 5);
    });

    test('Local ahead: same hash, local height > remote', () {
      final local = meta(snapshotHash: 'y', ledgerHeight: 4, chainHashHistory: [20, 21, 22, 23]);
      final remote = meta(snapshotHash: 'y', ledgerHeight: 1, chainHashHistory: [20]);
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.localAhead);
      expect(report.localLedgerHeight, 4);
      expect(report.remoteLedgerHeight, 1);
    });

    test('Fork detected: shared ancestor then divergence', () {
      final local = meta(
        snapshotHash: 'localTip',
        ledgerHeight: 4,
        chainHashHistory: [10, 11, 12, 99],
      );
      final remote = meta(
        snapshotHash: 'remoteTip',
        ledgerHeight: 4,
        chainHashHistory: [10, 11, 12, 88],
      );
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.forkDetected);
      expect(report.commonAncestorHeight, 3);
      expect(report.localSnapshotHash, 'localTip');
      expect(report.remoteSnapshotHash, 'remoteTip');
    });

    test('Snapshot mismatch: different hash and no common ancestor', () {
      final local = meta(
        snapshotHash: 'a',
        ledgerHeight: 2,
        chainHashHistory: [1, 2],
      );
      final remote = meta(
        snapshotHash: 'b',
        ledgerHeight: 2,
        chainHashHistory: [5, 6],
      );
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.snapshotMismatch);
      expect(report.commonAncestorHeight, isNull);
    });

    test('Protocol incompatible: major version mismatch', () {
      final local = meta(snapshotHash: 'h', ledgerHeight: 1, protocolVersion: _v1);
      final remote = DeterministicStateMetadata(
        snapshotHash: 'h',
        ledgerHeight: 1,
        protocolVersion: _v2,
        chainHashHistory: [1],
      );
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.protocolIncompatible);
      expect(report.details, contains('major'));
    });

    test('Empty ledger comparison: both empty', () {
      final local = meta(
        snapshotHash: '',
        ledgerHeight: 0,
        chainHashHistory: [],
      );
      final remote = meta(
        snapshotHash: '',
        ledgerHeight: 0,
        chainHashHistory: [],
      );
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.inSync);
      expect(report.localLedgerHeight, 0);
      expect(report.remoteLedgerHeight, 0);
    });

    test('Fork: one node has longer history, common prefix', () {
      final local = meta(
        snapshotHash: 'L',
        ledgerHeight: 5,
        chainHashHistory: [1, 2, 3, 4, 5],
      );
      final remote = meta(
        snapshotHash: 'R',
        ledgerHeight: 3,
        chainHashHistory: [1, 2, 3],
      );
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.type, DivergenceType.forkDetected);
      expect(report.commonAncestorHeight, 3);
    });

    test('Report is structurally complete', () {
      final local = meta(snapshotHash: 'l', ledgerHeight: 1, chainHashHistory: [1]);
      final remote = meta(snapshotHash: 'r', ledgerHeight: 1, chainHashHistory: [2]);
      final report = detector.detect(localState: local, remoteState: remote);
      expect(report.localSnapshotHash, 'l');
      expect(report.remoteSnapshotHash, 'r');
      expect(report.localLedgerHeight, 1);
      expect(report.remoteLedgerHeight, 1);
      expect(report.type, DivergenceType.snapshotMismatch);
    });
  });
}
