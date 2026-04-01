import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_report.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';
import 'package:iris_flutter_app/core/network/divergence/deterministic_state_metadata.dart';
import 'package:iris_flutter_app/core/network/reconciliation/reconciliation_engine.dart';
import 'package:iris_flutter_app/core/network/reconciliation/reconciliation_policy.dart';
import 'package:iris_flutter_app/core/network/reconciliation/reconciliation_result.dart';
import 'package:iris_flutter_app/core/network/reconciliation/replay_outcome.dart';

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

DivergenceReport report({
  required DivergenceType type,
  String localHash = 'local',
  String remoteHash = 'remote',
  int localHeight = 0,
  int remoteHeight = 0,
  int? commonAncestorHeight,
}) {
  return DivergenceReport(
    type: type,
    localSnapshotHash: localHash,
    remoteSnapshotHash: remoteHash,
    localLedgerHeight: localHeight,
    remoteLedgerHeight: remoteHeight,
    commonAncestorHeight: commonAncestorHeight,
  );
}

void main() {
  late ReconciliationEngine engine;

  setUp(() {
    engine = ReconciliationEngine();
  });

  group('ReconciliationEngine', () {
    test('IN_SYNC → no action', () {
      final div = report(type: DivergenceType.inSync, localHash: 'h', remoteHash: 'h', localHeight: 3, remoteHeight: 3);
      final local = meta(snapshotHash: 'h', ledgerHeight: 3);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 3);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, ReconciliationStatus.noAction);
      expect(result.appliedSegments, isNull);
    });

    test('REMOTE_AHEAD → needRemoteReplay when no outcome', () {
      final div = report(
        type: DivergenceType.remoteAhead,
        localHash: 'h',
        remoteHash: 'h',
        localHeight: 2,
        remoteHeight: 5,
      );
      final local = meta(snapshotHash: 'h', ledgerHeight: 2);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 5);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, ReconciliationStatus.needRemoteReplay);
    });

    test('REMOTE_AHEAD → appliedRemoteSegment when replay success', () {
      final div = report(
        type: DivergenceType.remoteAhead,
        localHash: 'h',
        remoteHash: 'h',
        localHeight: 2,
        remoteHeight: 5,
      );
      final local = meta(snapshotHash: 'h', ledgerHeight: 2);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 5);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
        replayOutcome: ReplayOutcome(success: true, appliedSegments: 3),
      );
      expect(result.status, ReconciliationStatus.appliedRemoteSegment);
      expect(result.appliedSegments, 3);
    });

    test('REMOTE_AHEAD → rejected when replay failed', () {
      final div = report(
        type: DivergenceType.remoteAhead,
        localHash: 'h',
        remoteHash: 'h',
        localHeight: 2,
        remoteHeight: 5,
      );
      final local = meta(snapshotHash: 'h', ledgerHeight: 2);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 5);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
        replayOutcome: ReplayOutcome(success: false),
      );
      expect(result.status, ReconciliationStatus.rejected);
      expect(result.message, contains('Replay'));
    });

    test('LOCAL_AHEAD → sentLocalSegment', () {
      final div = report(
        type: DivergenceType.localAhead,
        localHash: 'h',
        remoteHash: 'h',
        localHeight: 5,
        remoteHeight: 2,
      );
      final local = meta(snapshotHash: 'h', ledgerHeight: 5);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 2);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, ReconciliationStatus.sentLocalSegment);
    });

    test('FORK_DETECTED → forkDeferred', () {
      final div = report(
        type: DivergenceType.forkDetected,
        localHash: 'l',
        remoteHash: 'r',
        localHeight: 4,
        remoteHeight: 4,
        commonAncestorHeight: 2,
      );
      final local = meta(snapshotHash: 'l', ledgerHeight: 4);
      final remote = meta(snapshotHash: 'r', ledgerHeight: 4);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, ReconciliationStatus.forkDeferred);
      expect(result.message, contains('Fork'));
    });

    test('SNAPSHOT_MISMATCH → rejected', () {
      final div = report(
        type: DivergenceType.snapshotMismatch,
        localHash: 'a',
        remoteHash: 'b',
        localHeight: 2,
        remoteHeight: 2,
      );
      final local = meta(snapshotHash: 'a', ledgerHeight: 2);
      final remote = meta(snapshotHash: 'b', ledgerHeight: 2);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, ReconciliationStatus.rejected);
      expect(result.message, anyOf(contains('Snapshot'), contains('mismatch')));
    });

    test('PROTOCOL_INCOMPATIBLE → rejected', () {
      final div = report(type: DivergenceType.protocolIncompatible);
      final local = meta(snapshotHash: 'h', ledgerHeight: 1);
      final remote = DeterministicStateMetadata(
        snapshotHash: 'h',
        ledgerHeight: 1,
        protocolVersion: _v2,
        chainHashHistory: [1],
      );
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, ReconciliationStatus.rejected);
      expect(result.message, anyOf(contains('Protocol'), contains('incompatible')));
    });

    test('Policy allowRemoteReplay false → REMOTE_AHEAD rejected', () {
      final div = report(type: DivergenceType.remoteAhead, localHash: 'h', remoteHash: 'h', localHeight: 1, remoteHeight: 2);
      final local = meta(snapshotHash: 'h', ledgerHeight: 1);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 2);
      final policy = ReconciliationPolicy(allowRemoteReplay: false, allowLocalSend: true, allowForkHandling: false);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: policy,
      );
      expect(result.status, ReconciliationStatus.rejected);
      expect(result.message, contains('Policy'));
    });

    test('Policy allowLocalSend false → LOCAL_AHEAD rejected', () {
      final div = report(type: DivergenceType.localAhead, localHash: 'h', remoteHash: 'h', localHeight: 2, remoteHeight: 1);
      final local = meta(snapshotHash: 'h', ledgerHeight: 2);
      final remote = meta(snapshotHash: 'h', ledgerHeight: 1);
      final policy = ReconciliationPolicy(allowRemoteReplay: true, allowLocalSend: false, allowForkHandling: false);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: policy,
      );
      expect(result.status, ReconciliationStatus.rejected);
      expect(result.message, contains('Policy'));
    });

    test('Result is explicit and traceable', () {
      final div = report(type: DivergenceType.inSync, localHash: 'x', remoteHash: 'x', localHeight: 0, remoteHeight: 0);
      final local = meta(snapshotHash: 'x', ledgerHeight: 0);
      final remote = meta(snapshotHash: 'x', ledgerHeight: 0);
      final result = engine.reconcile(
        divergence: div,
        localState: local,
        remoteState: remote,
        policy: ReconciliationPolicy.base,
      );
      expect(result.status, isNotNull);
      expect(result.message, isNotEmpty);
      expect(result.toString(), contains('noAction'));
    });
  });
}
