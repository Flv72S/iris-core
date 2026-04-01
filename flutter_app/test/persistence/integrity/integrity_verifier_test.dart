// J5 — Integrity Verification Layer tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/integrity/get_raw_result.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_verifier.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_violation_type.dart';
import 'package:iris_flutter_app/persistence/integrity/record_type.dart';
import 'package:iris_flutter_app/persistence/integrity/verifiable_persistence_port.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/port/event_store_port.dart';
import 'package:iris_flutter_app/persistence/port/execution_result_store_port.dart';
import 'package:iris_flutter_app/persistence/port/guard_report_store_port.dart';
import 'package:iris_flutter_app/persistence/port/persistence_port.dart';
import 'package:iris_flutter_app/persistence/port/snapshot_store_port.dart';

void main() {
  late String tempDir;
  late FileSystemPersistenceAdapter adapter;
  late IntegrityVerifier verifier;
  const engine = Sha256DeterministicHashEngine();

  setUp(() {
    final d = Directory.systemTemp.createTempSync('iris_j5_');
    tempDir = d.path;
    adapter = FileSystemPersistenceAdapter(
      baseDirectory: tempDir,
      hashEngine: engine,
    );
    verifier = IntegrityVerifier(
      persistencePort: adapter,
      hashEngine: engine,
    );
  });

  tearDown(() {
    try {
      Directory(tempDir).deleteSync(recursive: true);
    } catch (_) {}
  });

  group('J5 — Valid record', () {
    test('save valid snapshot then verifyAll() yields 0 violations', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e1',
        schemaVersion: '1',
        governanceHash: 'gh',
        lifecycleHash: 'lh',
        governanceData: {'k': 'v'},
        lifecycleData: {},
        logicalTimestamp: 1000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final report = verifier.verifyAll();
      expect(report.violations, isEmpty);
      expect(report.totalRecordsChecked, 1);
      expect(report.validRecords, 1);
      expect(report.corruptedRecords, 0);
      expect(report.missingFiles, 0);
      expect(report.mismatchedHash, 0);
    });

    test('verifyByType(snapshot) on valid snapshot yields 0 violations', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e2',
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {},
        lifecycleData: {},
        logicalTimestamp: 2000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final report = verifier.verifyByType(RecordType.snapshot);
      expect(report.violations, isEmpty);
      expect(report.validRecords, 1);
    });
  });

  group('J5 — Tampered content', () {
    test('after tampering file content verifyAll() reports HASH_MISMATCH_RECOMPUTED', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e3',
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'a': 1},
        lifecycleData: {},
        logicalTimestamp: 3000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final hashes = adapter.listSnapshots();
      expect(hashes.length, 1);
      final path = '$tempDir/snapshots/${hashes.single}.record';
      final file = File(path);
      final content = file.readAsStringSync();
      final sep = content.indexOf('\n---\n');
      final body = content.substring(sep + 5);
      final tamperedBody = body.replaceFirst('a=1', 'a=2');
      file.writeAsStringSync(content.substring(0, sep + 5) + tamperedBody);

      final report = verifier.verifyAll();
      final recomputedViolations = report.violations
          .where((v) => v.violationType == IntegrityViolationType.HASH_MISMATCH_RECOMPUTED)
          .toList();
      expect(recomputedViolations, isNotEmpty);
    });
  });

  group('J5 — Tampered filename', () {
    test('after renaming file to wrong hash verifyAll() reports HASH_MISMATCH_FILENAME', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e4',
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'x': 'y'},
        lifecycleData: {},
        logicalTimestamp: 4000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final hashes = adapter.listSnapshots();
      expect(hashes.length, 1);
      final correctPath = '$tempDir/snapshots/${hashes.single}.record';
      final wrongPath = '$tempDir/snapshots/wrong_hash_abc123.record';
      File(correctPath).renameSync(wrongPath);

      final report = verifier.verifyAll();
      final filenameViolations = report.violations
          .where((v) => v.violationType == IntegrityViolationType.HASH_MISMATCH_FILENAME)
          .toList();
      expect(filenameViolations, isNotEmpty);
    });
  });

  group('J5 — Corrupted format', () {
    test('file without proper header yields CORRUPTED_FORMAT', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e5',
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {},
        lifecycleData: {},
        logicalTimestamp: 5000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final hashes = adapter.listSnapshots();
      expect(hashes.length, 1);
      final path = '$tempDir/snapshots/${hashes.single}.record';
      File(path).writeAsStringSync('no delimiter and no HASH line');

      final report = verifier.verifyAll();
      final corrupted = report.violations
          .where((v) => v.violationType == IntegrityViolationType.CORRUPTED_FORMAT)
          .toList();
      expect(corrupted, isNotEmpty);
    });
  });

  group('J5 — Missing file', () {
    test('port that lists hash but returns Missing for getRaw yields FILE_MISSING', () {
      final fake = _FakePortMissing();
      final verifier2 = IntegrityVerifier(
        persistencePort: fake,
        hashEngine: engine,
      );
      final report = verifier2.verifyByType(RecordType.snapshot);
      expect(report.totalRecordsChecked, 1);
      expect(report.missingFiles, 1);
      final missing = report.violations
          .where((v) => v.violationType == IntegrityViolationType.FILE_MISSING)
          .toList();
      expect(missing, isNotEmpty);
    });
  });

  group('J5 — Multiple violations', () {
    test('one record can produce multiple violation entries', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e6',
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'p': 'q'},
        lifecycleData: {},
        logicalTimestamp: 6000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final hashes = adapter.listSnapshots();
      expect(hashes.length, 1);
      final path = '$tempDir/snapshots/${hashes.single}.record';
      final content = File(path).readAsStringSync();
      final sep = content.indexOf('\n---\n');
      final body = content.substring(sep + 5);
      final wrongPath = '$tempDir/snapshots/ffffffff.record';
      File(path).writeAsStringSync('TYPE=snapshot\nHASH=otherhash\nSCHEMA_VERSION=1\n---\n$body');
      File(path).renameSync(wrongPath);

      final report = verifier.verifyAll();
      expect(report.violations.length, greaterThanOrEqualTo(2));
    });
  });
}

/// Fake port: lists one hash but getRawRecord returns Missing (simulates missing file).
class _FakePortMissing implements VerifiablePersistencePort {
  @override
  List<String> listHashes(RecordType type) => type == RecordType.snapshot ? ['fake_hash_123'] : [];

  @override
  GetRawResult getRawRecord(RecordType type, String hashFromFilename) =>
      const GetRawMissing();

  @override
  SnapshotStorePort snapshotStore() => throw UnimplementedError();

  @override
  EventStorePort eventStore() => throw UnimplementedError();

  @override
  ExecutionResultStorePort executionStore() => throw UnimplementedError();

  @override
  GuardReportStorePort guardReportStore() => throw UnimplementedError();
}
