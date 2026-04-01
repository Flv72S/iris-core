// J4 — Tests for FileSystemPersistenceAdapter.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/model/persisted_guard_report.dart';

void main() {
  late String tempDir;
  late FileSystemPersistenceAdapter adapter;

  setUp(() {
    final d = Directory.systemTemp.createTempSync('iris_j4_');
    tempDir = d.path;
    adapter = FileSystemPersistenceAdapter(
      baseDirectory: tempDir,
      hashEngine: const Sha256DeterministicHashEngine(),
    );
  });

  tearDown(() {
    try {
      Directory(tempDir).deleteSync(recursive: true);
    } catch (_) {}
  });

  group('J4 — Directory creation', () {
    test('on first init, snapshots/results/events/failures/guards are created',
        () {
      expect(Directory('$tempDir/snapshots').existsSync(), isTrue);
      expect(Directory('$tempDir/results').existsSync(), isTrue);
      expect(Directory('$tempDir/events').existsSync(), isTrue);
      expect(Directory('$tempDir/failures').existsSync(), isTrue);
      expect(Directory('$tempDir/guards').existsSync(), isTrue);
    });
  });

  group('J4 — Save idempotent', () {
    test('saving same snapshot twice produces a single file', () async {
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
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final hashes = adapter.listSnapshots();
      expect(hashes.length, 1);
    });

    test('saving same guard report twice produces a single file', () async {
      final report = PersistedGuardReport(
        executionId: 'e1',
        schemaVersion: '1',
        compliant: true,
        violations: [],
        guardHash: 'h',
        logicalTimestamp: 2000,
      );
      await adapter.guardReportStore().saveReport(report);
      await adapter.guardReportStore().saveReport(report);
      expect(adapter.listGuards().length, 1);
    });
  });

  group('J4 — Load after save', () {
    test('save snapshot then load by hash returns equal object', () async {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e2',
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'a': 1},
        lifecycleData: {'b': 2},
        logicalTimestamp: 3000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      final hashes = adapter.listSnapshots();
      expect(hashes.length, 1);
      final loaded = adapter.loadSnapshot(hashes.single);
      expect(loaded, isNotNull);
      expect(loaded!.executionId, snapshot.executionId);
      expect(loaded.schemaVersion, snapshot.schemaVersion);
      expect(loaded.governanceHash, snapshot.governanceHash);
      expect(loaded.lifecycleHash, snapshot.lifecycleHash);
      expect(loaded.logicalTimestamp, snapshot.logicalTimestamp);
      expect(loaded.governanceData, snapshot.governanceData);
      expect(loaded.lifecycleData, snapshot.lifecycleData);
    });

    test('loadSnapshot with unknown hash returns null', () {
      expect(adapter.loadSnapshot('nonexistent_hash_abc'), isNull);
    });
  });

  group('J4 — List ordering', () {
    test('listSnapshots returns hashes in alphabetical order', () async {
      // Create multiple snapshots with different content so hashes differ.
      for (var i = 0; i < 3; i++) {
        final snapshot = PersistedGovernanceSnapshot(
          executionId: 'e$i',
          schemaVersion: '1',
          governanceHash: 'g$i',
          lifecycleHash: 'l$i',
          governanceData: {'i': i},
          lifecycleData: {},
          logicalTimestamp: 4000 + i,
        );
        await adapter.snapshotStore().saveSnapshot(snapshot);
      }
      final list = adapter.listSnapshots();
      expect(list.length, 3);
      final sorted = List<String>.from(list)..sort();
      expect(list, orderedEquals(sorted));
    });
  });

  group('J4 — Isolation from core', () {
    test('adapter file does not import core package', () {
      // Read the adapter library source and ensure no core import.
      final adapterPath = 'lib/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
      final content = File(adapterPath).readAsStringSync();
      expect(
        content.contains("package:iris_flutter_app/core"),
        isFalse,
        reason: 'Adapter must not import core',
      );
    });
  });
}
