// J7 — Time Travel Debug Layer tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/replay/execution_orchestrator_port.dart';
import 'package:iris_flutter_app/persistence/timetravel/step_type.dart';
import 'package:iris_flutter_app/persistence/timetravel/time_travel_engine.dart';

void main() {
  late String tempDir;
  late FileSystemPersistenceAdapter adapter;
  late TimeTravelEngine timeTravelEngine;
  const hashEngine = Sha256DeterministicHashEngine();

  setUp(() {
    final d = Directory.systemTemp.createTempSync('iris_j7_');
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

  group('J7 — Timeline completa', () {
    test('valid execution yields timeline with INITIAL_SNAPSHOT, PRE_EXECUTION, POST_EXECUTION, FINAL_RESULT', () async {
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
      final resultToSave = PersistedExecutionResult(
        executionId: resultNoHash.executionId,
        schemaVersion: resultNoHash.schemaVersion,
        resultHash: _hashResult(resultNoHash, hashEngine),
        resultData: Map<String, Object>.from(resultNoHash.resultData),
        logicalTimestamp: resultNoHash.logicalTimestamp,
      );

      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);

      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final timeline = await timeTravelEngine.buildTimeline(executionId);

      final types = timeline.steps.map((s) => s.stepType).toList();
      expect(types, contains(StepType.INITIAL_SNAPSHOT));
      expect(types, contains(StepType.PRE_EXECUTION));
      expect(types, contains(StepType.POST_EXECUTION));
      expect(types, contains(StepType.FINAL_RESULT));
      expect(timeline.deterministic, isTrue);
    });
  });

  group('J7 — ReplayUntil', () {
    test('replayUntil step N returns coherent state and stable hash', () async {
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
        resultData: {'x': 1},
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

      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final step1 = await timeTravelEngine.replayUntil(executionId, 1);
      final step2 = await timeTravelEngine.replayUntil(executionId, 2);

      expect(step1.stepIndex, 1);
      expect(step1.stepType, StepType.PRE_EXECUTION);
      expect(step1.stateHash, isNotEmpty);
      expect(step2.stepIndex, 2);
      expect(step2.stepType, StepType.POST_EXECUTION);
      expect(step2.stateHash, isNotEmpty);
      final timeline = await timeTravelEngine.buildTimeline(executionId);
      expect(timeline.steps[1].stateHash, step1.stateHash);
      expect(timeline.steps[2].stateHash, step2.stateHash);
    });
  });

  group('J7 — Divergenza rilevata', () {
    test('after tampering result file timeline has deterministic false and divergent step', () async {
      const executionId = 'e3';
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'_': 0},
        lifecycleData: {'_': 0},
        logicalTimestamp: 3000,
      );
      final resultNoHash = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'a': 1},
        logicalTimestamp: 3000,
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
      final path = '$tempDir/results/${hashes.single}.record';
      final content = File(path).readAsStringSync();
      final sep = content.indexOf('\n---\n');
      final body = content.substring(sep + 5);
      final tamperedBody = body.replaceFirst(
        'resultHash=${resultToSave.resultHash}',
        'resultHash=tampered_hash',
      );
      File(path).writeAsStringSync(content.substring(0, sep + 5) + tamperedBody);

      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final timeline = await timeTravelEngine.buildTimeline(executionId);

      expect(timeline.deterministic, isFalse);
      final finalStep = timeline.steps.last;
      expect(finalStep.differences, isNotEmpty);
      expect(finalStep.matchesPersistedState, isFalse);
    });
  });

  group('J7 — Deterministic stability', () {
    test('buildTimeline 3 times yields same hash, same steps, same order', () async {
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
      final resultNoHash = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'z': 2},
        logicalTimestamp: 4000,
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

      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );

      final t1 = await timeTravelEngine.buildTimeline(executionId);
      final t2 = await timeTravelEngine.buildTimeline(executionId);
      final t3 = await timeTravelEngine.buildTimeline(executionId);

      expect(t1.finalOriginalHash, t2.finalOriginalHash);
      expect(t2.finalOriginalHash, t3.finalOriginalHash);
      expect(t1.finalRecomputedHash, t2.finalRecomputedHash);
      expect(t2.finalRecomputedHash, t3.finalRecomputedHash);
      expect(t1.steps.length, t2.steps.length);
      expect(t2.steps.length, t3.steps.length);
      for (var i = 0; i < t1.steps.length; i++) {
        expect(t1.steps[i].stepType, t2.steps[i].stepType);
        expect(t2.steps[i].stepType, t3.steps[i].stepType);
        expect(t1.steps[i].stateHash, t2.steps[i].stateHash);
        expect(t2.steps[i].stateHash, t3.steps[i].stateHash);
      }
    });
  });

  group('J7 — Nessuna scrittura', () {
    test('buildTimeline and replayUntil do not create or modify files', () async {
      const executionId = 'e5';
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'g',
        lifecycleHash: 'l',
        governanceData: {'_': 0},
        lifecycleData: {'_': 0},
        logicalTimestamp: 5000,
      );
      final resultNoHash = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'_': 0},
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

      final before = _listFileKeys(tempDir);

      timeTravelEngine = TimeTravelEngine(
        persistencePort: adapter,
        hashEngine: hashEngine,
        orchestrator: _StubOrchestrator(returns: resultNoHash),
      );
      await timeTravelEngine.buildTimeline(executionId);
      await timeTravelEngine.replayUntil(executionId, 0);
      await timeTravelEngine.replayUntil(executionId, 1);

      final after = _listFileKeys(tempDir);

      expect(after, equals(before));
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

List<String> _listFileKeys(String dirPath) {
  final dir = Directory(dirPath);
  if (!dir.existsSync()) return [];
  final list = <String>[];
  for (final e in dir.listSync(recursive: true)) {
    if (e is File) list.add('${e.path}|${e.lastModifiedSync().millisecondsSinceEpoch}');
  }
  list.sort();
  return list;
}

class _StubOrchestrator implements ExecutionOrchestratorPort {
  _StubOrchestrator({required this.returns});
  final PersistedExecutionResult returns;

  @override
  Future<PersistedExecutionResult> execute(PersistedGovernanceSnapshot snapshot) async =>
      returns;
}
