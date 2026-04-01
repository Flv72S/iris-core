// IRIS Phase J — End-to-End Deterministic Validation.
// Package: phasej.e2e — Full flow J1–J8.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/file_system_persistence_adapter.dart';
import 'package:iris_flutter_app/persistence/forensic/forensic_export_service.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_verifier.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_violation_type.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/model/persisted_guard_report.dart';
import 'package:iris_flutter_app/persistence/model/persisted_observability_event.dart';
import 'package:iris_flutter_app/persistence/replay/execution_orchestrator_port.dart';
import 'package:iris_flutter_app/persistence/replay/replay_difference_type.dart';
import 'package:iris_flutter_app/persistence/replay/replay_engine.dart';
import 'package:iris_flutter_app/persistence/timetravel/time_travel_engine.dart';

void main() {
  late String tempDir;
  late FileSystemPersistenceAdapter adapter;
  late DeterministicHashEngine hashEngine;
  late IntegrityVerifier integrityVerifier;
  late ReplayEngine replayEngine;
  late TimeTravelEngine timeTravelEngine;
  late ForensicExportService forensicExportService;
  late _E2EOrchestrator orchestrator;

  setUp(() {
    final d = Directory.systemTemp.createTempSync('iris_phasej_e2e_');
    tempDir = d.path;
    hashEngine = const Sha256DeterministicHashEngine();
    adapter = FileSystemPersistenceAdapter(
      baseDirectory: tempDir,
      hashEngine: hashEngine,
    );
    integrityVerifier = IntegrityVerifier(
      persistencePort: adapter,
      hashEngine: hashEngine,
    );
    orchestrator = _E2EOrchestrator(hashEngine: hashEngine);
    replayEngine = ReplayEngine(
      persistencePort: adapter,
      hashEngine: hashEngine,
      orchestrator: orchestrator,
    );
    timeTravelEngine = TimeTravelEngine(
      persistencePort: adapter,
      hashEngine: hashEngine,
      orchestrator: orchestrator,
    );
    forensicExportService = ForensicExportService(
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

  group('Phase J E2E — Full flow', () {
    test('STEP 1–8: setup, execution, persist, integrity, replay, timeline, forensic, deterministic re-run', () async {
      const executionId = 'phasej-e2e-1';

      // ——— STEP 2: Real execution ———
      final snapshot = PersistedGovernanceSnapshot(
        executionId: executionId,
        schemaVersion: '1',
        governanceHash: 'gov-hash',
        lifecycleHash: 'life-hash',
        governanceData: {'policy': 'strict'},
        lifecycleData: {'phase': 1},
        logicalTimestamp: 1000,
      );
      final resultFromOrchestrator = PersistedExecutionResult(
        executionId: executionId,
        schemaVersion: '1',
        resultHash: '',
        resultData: {'status': 'ok', 'value': 42},
        logicalTimestamp: 1001,
      );
      orchestrator.setResult(resultFromOrchestrator);
      final executedResult = await orchestrator.execute(snapshot);

      // ——— STEP 3: Persistence ———
      final resultToSave = PersistedExecutionResult(
        executionId: executedResult.executionId,
        schemaVersion: executedResult.schemaVersion,
        resultHash: HashUtils.hashResult(executedResult, hashEngine),
        resultData: Map<String, Object>.from(executedResult.resultData),
        logicalTimestamp: executedResult.logicalTimestamp,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);

      final event = PersistedObservabilityEvent(
        executionId: executionId,
        eventId: 'evt-1',
        eventType: 'execution_complete',
        payload: {'step': 1},
        logicalTimestamp: 1002,
        eventHash: HashUtils.hashEvent(
          PersistedObservabilityEvent(
            executionId: executionId,
            eventId: 'evt-1',
            eventType: 'execution_complete',
            payload: {'step': 1},
            logicalTimestamp: 1002,
            eventHash: '',
            schemaVersion: '1',
          ),
          hashEngine,
        ),
        schemaVersion: '1',
      );
      await adapter.eventStore().appendEvent(event);

      final guard = PersistedGuardReport(
        executionId: executionId,
        schemaVersion: '1',
        compliant: true,
        violations: [],
        guardHash: HashUtils.hashGuard(
          PersistedGuardReport(
            executionId: executionId,
            schemaVersion: '1',
            compliant: true,
            violations: [],
            guardHash: '',
            logicalTimestamp: 1003,
          ),
          hashEngine,
        ),
        logicalTimestamp: 1003,
      );
      await adapter.guardReportStore().saveReport(guard);

      // Verify files created; filename = hash; no duplication
      final snapshotHashes = adapter.listSnapshots();
      final resultHashes = adapter.listResults();
      final eventHashes = adapter.listEvents();
      final guardHashes = adapter.listGuards();
      expect(snapshotHashes.length, 1);
      expect(resultHashes.length, 1);
      expect(eventHashes.length, 1);
      expect(guardHashes.length, 1);
      final snapshotPath = '$tempDir/snapshots/${snapshotHashes.single}.record';
      expect(File(snapshotPath).existsSync(), isTrue);
      expect(snapshotHashes.single.length, greaterThan(10));

      // ——— STEP 4: Integrity verification ———
      final report = integrityVerifier.verifyAll();
      expect(report.validRecords, greaterThan(0));
      expect(report.corruptedRecords, 0);
      expect(report.mismatchedHash, 0);

      // ——— STEP 5: Replay engine ———
      final replayResult = await replayEngine.replayExecution(executionId);
      expect(replayResult.replaySuccessful, isTrue);
      expect(replayResult.differences, isEmpty);

      // ——— STEP 6: Time travel timeline ———
      final timeline = await timeTravelEngine.buildTimeline(executionId);
      expect(timeline.deterministic, isTrue);
      expect(timeline.steps.length, greaterThan(0));

      // ——— STEP 7: Forensic package ———
      final pkg = await forensicExportService.generatePackage(executionId);
      expect(pkg.integrityValid, isTrue);
      expect(pkg.replayDeterministic, isTrue);
      expect(pkg.packageHash.isNotEmpty, isTrue);
      expect(pkg.records.length, greaterThan(0));

      // ——— STEP 8: Deterministic re-run ———
      final pkg2 = await forensicExportService.generatePackage(executionId);
      expect(pkg2.packageHash, pkg.packageHash);
      expect(pkg2.manifest.manifestHash, pkg.manifest.manifestHash);
      expect(pkg2.records.length, pkg.records.length);
    });
  });

  group('Phase J E2E — Tampering', () {
    test('alter persisted file → integrity mismatch, replay fails, forensic integrityValid false', () async {
      const executionId = 'phasej-e2e-tamper';
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
        resultHash: HashUtils.hashResult(resultNoHash, hashEngine),
        resultData: Map<String, Object>.from(resultNoHash.resultData),
        logicalTimestamp: resultNoHash.logicalTimestamp,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      orchestrator.setResult(resultNoHash);

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

      final report = integrityVerifier.verifyAll();
      final mismatch = report.violations.any(
        (v) => v.violationType == IntegrityViolationType.HASH_MISMATCH_FILENAME ||
            v.violationType == IntegrityViolationType.HASH_MISMATCH_RECOMPUTED ||
            v.violationType == IntegrityViolationType.HASH_MISMATCH_CONTENT,
      );
      expect(mismatch, isTrue);

      final replayResult = await replayEngine.replayExecution(executionId);
      expect(replayResult.replaySuccessful, isFalse);

      final pkg = await forensicExportService.generatePackage(executionId);
      expect(pkg.integrityValid, isFalse);
    });
  });

  group('Phase J E2E — Missing file', () {
    test('delete snapshot → replay MISSING_RECORD; package reflects incomplete state', () async {
      const executionId = 'phasej-e2e-missing';
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
        resultData: {'y': 2},
        logicalTimestamp: 3000,
      );
      final resultToSave = PersistedExecutionResult(
        executionId: resultNoHash.executionId,
        schemaVersion: resultNoHash.schemaVersion,
        resultHash: HashUtils.hashResult(resultNoHash, hashEngine),
        resultData: Map<String, Object>.from(resultNoHash.resultData),
        logicalTimestamp: resultNoHash.logicalTimestamp,
      );
      await adapter.snapshotStore().saveSnapshot(snapshot);
      await adapter.executionStore().saveResult(resultToSave);
      orchestrator.setResult(resultNoHash);

      await adapter.snapshotStore().delete(executionId);

      final replayResult = await replayEngine.replayExecution(executionId);
      final missingRecord = replayResult.differences.any(
        (d) => d.differenceType == ReplayDifferenceType.MISSING_RECORD,
      );
      expect(missingRecord, isTrue);
      expect(replayResult.replaySuccessful, isFalse);

      final pkg = await forensicExportService.generatePackage(executionId);
      final hasSnapshotRecord = pkg.records.any((r) => r.recordType == 'snapshot');
      expect(hasSnapshotRecord, isFalse);
    });
  });
}

class _E2EOrchestrator implements ExecutionOrchestratorPort {
  _E2EOrchestrator({required this.hashEngine});
  final DeterministicHashEngine hashEngine;
  PersistedExecutionResult? _result;

  void setResult(PersistedExecutionResult r) => _result = r;

  @override
  Future<PersistedExecutionResult> execute(PersistedGovernanceSnapshot snapshot) async {
    if (_result == null) throw StateError('E2E orchestrator: no result set');
    return _result!;
  }
}
