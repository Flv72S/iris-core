// J6 — Replay Engine tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/replay/execution_orchestrator_port.dart';
import 'package:iris_flutter_app/persistence/replay/replay_difference_type.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/replay/replay_engine.dart';

void main() {
  late String tempDir;
  late FileSystemPersistenceAdapter adapter;
  late ReplayEngine engine;
  const hashEngine = Sha256DeterministicHashEngine();

  setUp(() {
    final d = Directory.systemTemp.createTempSync('iris_j6_');
    tempDir = d.path;
    adapter = FileSystemPersistenceAdapter(
      baseDirectory: tempDir,
      hashEngine: hashEngine,
    );
  });

  tearDown(() {
    try {
      Directory(tempDir).deleteSync(recursive: true);
    } catch (_) {}
  });

  group('J6 — Successful replay', () {
    test('execute then persist then replay yields replaySuccessful true and no differences', () async {
      const executionId = 'e1';
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'gh',
        lifecycleHash: 'lh',
        governanceData: {'k': 'v'},
        lifecycleData: {'_': 0},
        logicalTimestamp: 1000,
      );
      final resultNoHash = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'out': 1},
        logicalTimestamp: 1000,
      );
      final declaredHash = _hashResult(resultNoHash, hashEngine);
      final resultToSave = PersistedExecutionResult(
        executionId: resultNoHash.executionId,
        schemaVersion: resultNoHash.schemaVersion,
        resultHash: declaredHash,
        resultData: Map<String, Object>.from(resultNoHash.resultData),
        logicalTimestamp: resultNoHash.logicalTimestamp,
      );

      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);

      engine = ReplayEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final replayResult = await engine.replayExecution(executionId);

      expect(replayResult.replaySuccessful, isTrue);
      expect(replayResult.differences, isEmpty);
      expect(replayResult.originalHash, declaredHash);
      expect(replayResult.recomputedHash, declaredHash);
    });
  });

  group('J6 — Tampered result', () {
    test('after tampering result file replay yields replaySuccessful false and HASH_MISMATCH', () async {
      const executionId = 'e2';
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'_': 0},
        lifecycleData: {'_': 0},
        logicalTimestamp: 2000,
      );
      final resultNoHash = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'a': 1},
        logicalTimestamp: 2000,
      );
      final resultToSave = PersistedExecutionResult(
        executionId: resultNoHash.executionId,
        schemaVersion: resultNoHash.schemaVersion,
        resultHash: _hashResult(resultNoHash, hashEngine),
        resultData: Map<String, Object>.from(resultNoHash.resultData),
        logicalTimestamp: resultNoHash.logicalTimestamp,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);

      final hashes = adapter.listResults();
      expect(hashes.length, 1);
      final path = '$tempDir/results/${hashes.single}.record';
      final content = File(path).readAsStringSync();
      final sep = content.indexOf('\n---\n');
      final body = content.substring(sep + 5);
      final tamperedBody = body.replaceFirst(
        'resultHash=${resultToSave.resultHash}',
        'resultHash=tampered_wrong_hash',
      );
      File(path).writeAsStringSync(content.substring(0, sep + 5) + tamperedBody);

      engine = ReplayEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final replayResult = await engine.replayExecution(executionId);

      expect(replayResult.replaySuccessful, isFalse);
      final hashMismatch = replayResult.differences
          .where((d) => d.differenceType == ReplayDifferenceType.HASH_MISMATCH)
          .toList();
      expect(hashMismatch, isNotEmpty);
    });
  });

  group('J6 — Missing snapshot', () {
    test('when snapshot is missing replay yields MISSING_RECORD', () async {
      const executionId = 'e3';
      final result = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: 'h',
        resultData: {'_': 0},
        logicalTimestamp: 3000,
      );
      await adapter.executionStore().saveResult(result);
      engine = ReplayEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: result),
      );

      final replayResult = await engine.replayExecution(executionId);

      expect(replayResult.replaySuccessful, isFalse);
      final missing = replayResult.differences
          .where((d) => d.differenceType == ReplayDifferenceType.MISSING_RECORD)
          .toList();
      expect(missing, isNotEmpty);
      expect(missing.any((d) => d.fieldName == 'snapshot'), isTrue);
    });
  });

  group('J6 — Corrupted snapshot', () {
    test('when orchestrator throws on snapshot replay yields CORRUPTED_RECORD', () async {
      const executionId = 'e4';
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'_': 0},
        lifecycleData: {'_': 0},
        logicalTimestamp: 4000,
      );
      final result = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: 'h',
        resultData: {'_': 0},
        logicalTimestamp: 4000,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(result);

      engine = ReplayEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _ThrowingOrchestrator(),
      );

      final replayResult = await engine.replayExecution(executionId);

      expect(replayResult.replaySuccessful, isFalse);
      final corrupted = replayResult.differences
          .where((d) => d.differenceType == ReplayDifferenceType.CORRUPTED_RECORD)
          .toList();
      expect(corrupted, isNotEmpty);
    });
  });

  group('J6 — Deterministic consistency', () {
    test('replay 3 times yields identical hash and no variation', () async {
      const executionId = 'e5';
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'x': 1},
        lifecycleData: {'_': 0},
        logicalTimestamp: 5000,
      );
      final resultNoHash = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'y': 2},
        logicalTimestamp: 5000,
      );
      final resultToSave = PersistedExecutionResult(
        executionId: resultNoHash.executionId,
        schemaVersion: resultNoHash.schemaVersion,
        resultHash: _hashResult(resultNoHash, hashEngine),
        resultData: Map<String, Object>.from(resultNoHash.resultData),
        logicalTimestamp: resultNoHash.logicalTimestamp,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);

      engine = ReplayEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final r1 = await engine.replayExecution(executionId);
      final r2 = await engine.replayExecution(executionId);
      final r3 = await engine.replayExecution(executionId);

      expect(r1.replaySuccessful, isTrue);
      expect(r2.replaySuccessful, isTrue);
      expect(r3.replaySuccessful, isTrue);
      expect(r1.recomputedHash, r2.recomputedHash);
      expect(r2.recomputedHash, r3.recomputedHash);
      expect(r1.originalHash, r2.originalHash);
      expect(r2.originalHash, r3.originalHash);
    });
  });
}

String _hashResult(PersistedExecutionResult result, DeterministicHashEngine engine) {
  final r = PersistedExecutionResult(
    executionId: result.executionId,
    schemaVersion: result.schemaVersion,
    resultHash: '',
    resultData: Map<String, Object>.from(result.resultData),
    logicalTimestamp: result.logicalTimestamp,
  );
  return HashUtils.hashResult(r, engine);
}

class _StubOrchestrator implements ExecutionOrchestratorPort {
  _StubOrchestrator({required this.returns});
  final PersistedExecutionResult returns;

  @override
  Future<PersistedExecutionResult> execute(PersistedGovernanceSnapshot snapshot) async =>
      returns;
}

class _ThrowingOrchestrator implements ExecutionOrchestratorPort {
  @override
  Future<PersistedExecutionResult> execute(PersistedGovernanceSnapshot snapshot) async {
    throw StateError('corrupted');
  }
}
