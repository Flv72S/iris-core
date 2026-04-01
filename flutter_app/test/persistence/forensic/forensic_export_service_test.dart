// J8 — Forensic Export & Audit Package Generator tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_verifier.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/replay/execution_orchestrator_port.dart';
import 'package:iris_flutter_app/persistence/forensic/forensic_export_service.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/timetravel/time_travel_engine.dart';

void main() {
  late String tempDir;
  late FileSystemPersistenceAdapter adapter;
  late IntegrityVerifier integrityVerifier;
  late TimeTravelEngine timeTravelEngine;
  late ForensicExportService forensicService;
  const hashEngine = Sha256DeterministicHashEngine();

  setUp(() {
    final d = Directory.systemTemp.createTempSync('iris_j8_');
    tempDir = d.path;
    adapter = FileSystemPersistenceAdapter(
      baseDirectory: tempDir,
      hashEngine: hashEngine,
    );
    integrityVerifier = IntegrityVerifier(
      persistencePort: adapter,
      hashEngine: hashEngine,
    );
    timeTravelEngine = TimeTravelEngine(
      persistencePort: adapter,
      hashEngine: hashEngine,
      orchestrator: _StubOrchestrator(returns: null),
    );
    forensicService = ForensicExportService(
      persistencePort: adapter,
      hashEngine: hashEngine,
      integrityVerifier: integrityVerifier,
      timeTravelEngine: timeTravelEngine,
    );
  });

  tearDown(() {
    try {
      Directory(tempDir).deleteSync(recursive: true);
    } catch (_) {}
  });

  group('J8 — Deterministic package', () {
    test('generate package twice yields identical packageHash', () async {
      const executionId = 'e1';
      final snapshot = _snapshot(executionId);
      final resultNoHash = _result(executionId, {'x': 1});
      final resultToSave = _resultWithHash(resultNoHash, hashEngine);
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );
      forensicService = ForensicExportService(
        persistencePort: adapter,
        hashEngine: hashEngine,
        integrityVerifier: integrityVerifier,
        timeTravelEngine: timeTravelEngine,
      );

      final p1 = await forensicService.generatePackage(executionId);
      final p2 = await forensicService.generatePackage(executionId);

      expect(p1.packageHash, p2.packageHash);
      expect(p1.manifest.manifestHash, p2.manifest.manifestHash);
    });
  });

  group('J8 — Tampered record', () {
    test('after tampering result file integrityValid is false and packageHash changes', () async {
      const executionId = 'e2';
      final snapshot = _snapshot(executionId);
      final resultNoHash = _result(executionId, {'a': 1});
      final resultToSave = _resultWithHash(resultNoHash, hashEngine);
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );
      forensicService = ForensicExportService(
        persistencePort: adapter,
        hashEngine: hashEngine,
        integrityVerifier: integrityVerifier,
        timeTravelEngine: timeTravelEngine,
      );

      final p1 = await forensicService.generatePackage(executionId);

      final hashes = adapter.listResults();
      final path = '$tempDir/results/${hashes.single}.record';
      final content = File(path).readAsStringSync();
      final sep = content.indexOf('\n---\n');
      final body = content.substring(sep + 5);
      final tamperedBody = body.replaceFirst(
        'resultHash=${resultToSave.resultHash}',
        'resultHash=tampered_hash',
      );
      File(path).writeAsStringSync(content.substring(0, sep + 5) + tamperedBody);

      final p2 = await forensicService.generatePackage(executionId);

      expect(p2.integrityValid, isFalse);
      expect(p2.packageHash, isNot(p1.packageHash));
    });
  });

  group('J8 — Replay divergence', () {
    test('after tampering result replayDeterministic is false', () async {
      const executionId = 'e3';
      final snapshot = _snapshot(executionId);
      final resultNoHash = _result(executionId, {'b': 2});
      final resultToSave = _resultWithHash(resultNoHash, hashEngine);
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );
      forensicService = ForensicExportService(
        persistencePort: adapter,
        hashEngine: hashEngine,
        integrityVerifier: integrityVerifier,
        timeTravelEngine: timeTravelEngine,
      );

      final hashes = adapter.listResults();
      final path = '$tempDir/results/${hashes.single}.record';
      final content = File(path).readAsStringSync();
      final tamperedContent = content.replaceFirst(
        'resultHash=${resultToSave.resultHash}',
        'resultHash=divergent',
      );
      File(path).writeAsStringSync(tamperedContent);

      final pkg = await forensicService.generatePackage(executionId);

      expect(pkg.replayDeterministic, isFalse);
    });
  });

  group('J8 — Stable ordering', () {
    test('package records are in deterministic type-then-hash order', () async {
      const executionId = 'e4';
      final snapshot = _snapshot(executionId);
      final resultNoHash = _result(executionId, {'z': 0});
      final resultToSave = _resultWithHash(resultNoHash, hashEngine);
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );
      forensicService = ForensicExportService(
        persistencePort: adapter,
        hashEngine: hashEngine,
        integrityVerifier: integrityVerifier,
        timeTravelEngine: timeTravelEngine,
      );

      final p1 = await forensicService.generatePackage(executionId);
      final p2 = await forensicService.generatePackage(executionId);

      expect(p1.records.length, p2.records.length);
      for (var i = 0; i < p1.records.length; i++) {
        expect(p1.records[i].recordType, p2.records[i].recordType);
        expect(p1.records[i].recordHash, p2.records[i].recordHash);
      }
      expect(p1.manifest.recordHashes, orderedEquals(p2.manifest.recordHashes));
    });
  });

  group('J8 — Export directory', () {
    test('exportToDirectory creates manifest.txt and record files; two exports identical', () async {
      const executionId = 'e5';
      final snapshot = _snapshot(executionId);
      final resultNoHash = _result(executionId, {'_': 0});
      final resultToSave = _resultWithHash(resultNoHash, hashEngine);
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );
      forensicService = ForensicExportService(
        persistencePort: adapter,
        hashEngine: hashEngine,
        integrityVerifier: integrityVerifier,
        timeTravelEngine: timeTravelEngine,
      );

      final exportDir = Directory.systemTemp.createTempSync('iris_j8_export_');
      final exportPath = exportDir.path;

      await forensicService.exportToDirectory(executionId, exportPath);
      final manifest1 = File('$exportPath/manifest.txt').readAsStringSync();
      final recordsDir1 = Directory('$exportPath/records');
      final list1 = recordsDir1.existsSync()
          ? recordsDir1.listSync().whereType<File>().map((f) => f.path).toList()
          : <String>[];
      list1.sort();
      final files1 = list1;

      await forensicService.exportToDirectory(executionId, exportPath);
      final manifest2 = File('$exportPath/manifest.txt').readAsStringSync();
      final list2 = recordsDir1.existsSync()
          ? recordsDir1.listSync().whereType<File>().map((f) => f.path).toList()
          : <String>[];
      list2.sort();
      final files2 = list2;

      expect(manifest1, manifest2);
      expect(files1, orderedEquals(files2));

      try { exportDir.deleteSync(recursive: true); } catch (_) {}
    });
  });
}

PersistedGovernanceSnapshot _snapshot(String executionId) =>
    PersistedGovernanceSnapshot(
      executionId: executionId,
      schemaVersion: '1',
      governanceHash: 'g',
      lifecycleHash: 'l',
      governanceData: {'_': 0},
      lifecycleData: {'_': 0},
      logicalTimestamp: 1000,
    );

PersistedExecutionResult _result(String executionId, Map<String, Object> data) =>
    PersistedExecutionResult(
      executionId: executionId,
      schemaVersion: '1',
      resultHash: '',
      resultData: data,
      logicalTimestamp: 1000,
    );

PersistedExecutionResult _resultWithHash(
  PersistedExecutionResult r,
  DeterministicHashEngine engine,
) =>
    PersistedExecutionResult(
      executionId: r.executionId,
      schemaVersion: r.schemaVersion,
      resultHash: HashUtils.hashResult(r, engine),
      resultData: Map<String, Object>.from(r.resultData),
      logicalTimestamp: r.logicalTimestamp,
    );

class _StubOrchestrator implements ExecutionOrchestratorPort {
  _StubOrchestrator({required this.returns});
  final PersistedExecutionResult? returns;

  @override
  Future<PersistedExecutionResult> execute(PersistedGovernanceSnapshot snapshot) async {
    if (returns != null) return returns!;
    throw StateError('no stub result');
  }
}
