// J7 — Time Travel Debug Layer. Step-by-step deterministic replay; read-only.

import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/port/persistence_port.dart';
import 'package:iris_flutter_app/persistence/replay/execution_orchestrator_port.dart';
import 'package:iris_flutter_app/persistence/replay/replay_difference.dart';
import 'package:iris_flutter_app/persistence/replay/replay_difference_type.dart';
import 'package:iris_flutter_app/persistence/timetravel/replay_step.dart';
import 'package:iris_flutter_app/persistence/timetravel/replay_timeline.dart';
import 'package:iris_flutter_app/persistence/timetravel/step_type.dart';

/// Builds deterministic replay timelines and supports step-by-step inspection.
class TimeTravelEngine {
  TimeTravelEngine({
    required PersistencePort persistencePort,
    required DeterministicHashEngine hashEngine,
    required ExecutionOrchestratorPort orchestrator,
  })  : _port = persistencePort,
        _engine = hashEngine,
        _orchestrator = orchestrator;

  final PersistencePort _port;
  final DeterministicHashEngine _engine;
  final ExecutionOrchestratorPort _orchestrator;

  /// Builds the full timeline for [executionId]. No disk write.
  Future<ReplayTimeline> buildTimeline(String executionId) async {
    final snapshot = await _port.snapshotStore().getSnapshot(executionId);
    final originalResult = await _port.executionStore().getResult(executionId);
    final events = await _port.eventStore().getEvents(executionId);

    if (snapshot == null) {
      return ReplayTimeline(
        executionId: executionId,
        steps: [
          ReplayStep(
            stepIndex: 0,
            stepType: StepType.INITIAL_SNAPSHOT,
            inputState: const {},
            outputState: const {},
            stateHash: '',
            matchesPersistedState: false,
            differences: [
              ReplayDifference(
                fieldName: 'snapshot',
                originalValue: '',
                recomputedValue: '',
                differenceType: ReplayDifferenceType.MISSING_RECORD,
              ),
            ],
          ),
        ],
        deterministic: false,
        finalOriginalHash: originalResult?.resultHash ?? '',
        finalRecomputedHash: '',
      );
    }

    final steps = <ReplayStep>[];
    Map<String, Object> snapshotMap = _copyMap(snapshot.toMap());

    final step0Out = snapshotMap;
    final hash0 = _engine.hash(Map<String, Object?>.from(step0Out));
    steps.add(ReplayStep(
      stepIndex: 0,
      stepType: StepType.INITIAL_SNAPSHOT,
      inputState: const {},
      outputState: step0Out,
      stateHash: hash0,
      matchesPersistedState: true,
      differences: const [],
    ));

    final step1In = _copyMap(snapshotMap);
    final step1Out = _copyMap(snapshotMap);
    final hash1 = _engine.hash(Map<String, Object?>.from(step1Out));
    steps.add(ReplayStep(
      stepIndex: 1,
      stepType: StepType.PRE_EXECUTION,
      inputState: step1In,
      outputState: step1Out,
      stateHash: hash1,
      matchesPersistedState: true,
      differences: const [],
    ));

    PersistedExecutionResult recomputedResult;
    try {
      recomputedResult = await _orchestrator.execute(snapshot);
    } catch (_) {
      steps.add(ReplayStep(
        stepIndex: 2,
        stepType: StepType.POST_EXECUTION,
        inputState: _copyMap(snapshotMap),
        outputState: const {},
        stateHash: '',
        matchesPersistedState: false,
        differences: [
          ReplayDifference(
            fieldName: 'execution',
            originalValue: '',
            recomputedValue: '',
            differenceType: ReplayDifferenceType.CORRUPTED_RECORD,
          ),
        ],
      ));
      return ReplayTimeline(
        executionId: executionId,
        steps: List.unmodifiable(steps),
        deterministic: false,
        finalOriginalHash: originalResult?.resultHash ?? '',
        finalRecomputedHash: '',
      );
    }

    final recomputedMap = _copyMap(recomputedResult.toMap());
    final recomputedHash = HashUtils.hashResult(recomputedResult, _engine);
    final hash2 = _engine.hash(Map<String, Object?>.from(recomputedMap));
    steps.add(ReplayStep(
      stepIndex: 2,
      stepType: StepType.POST_EXECUTION,
      inputState: _copyMap(snapshotMap),
      outputState: recomputedMap,
      stateHash: hash2,
      matchesPersistedState: true,
      differences: const [],
    ));

    if (events.isNotEmpty) {
      for (var i = 0; i < events.length; i++) {
        final em = _copyMap(events[i].toMap());
        final eh = _engine.hash(Map<String, Object?>.from(em));
        steps.add(ReplayStep(
          stepIndex: 3 + i,
          stepType: StepType.EVENT_EMISSION,
          inputState: const {},
          outputState: em,
          stateHash: eh,
          matchesPersistedState: true,
          differences: const [],
        ));
      }
    }

    final resultStepIndex = 3 + events.length;
    final originalHash = originalResult?.resultHash ?? '';
    final originalMap = originalResult != null
        ? _copyMap(originalResult.toMap())
        : <String, Object>{};
    final finalMatches = originalResult != null && originalHash == recomputedHash;
    final fieldDiffs = originalResult != null && originalHash != recomputedHash
        ? _fieldDifferences(originalResult.toMap(), recomputedResult.toMap())
        : <ReplayDifference>[];
    final finalDiffs = originalHash != recomputedHash && originalResult != null
        ? [
            ReplayDifference(
              fieldName: 'resultHash',
              originalValue: originalHash,
              recomputedValue: recomputedHash,
              differenceType: ReplayDifferenceType.HASH_MISMATCH,
            ),
            ...fieldDiffs,
          ]
        : fieldDiffs;

    steps.add(ReplayStep(
      stepIndex: resultStepIndex,
      stepType: StepType.FINAL_RESULT,
      inputState: _copyMap(recomputedMap),
      outputState: originalMap,
      stateHash: originalResult != null
          ? _engine.hash(Map<String, Object?>.from(originalMap))
          : '',
      matchesPersistedState: finalMatches,
      differences: finalDiffs,
    ));

    return ReplayTimeline(
      executionId: executionId,
      steps: List.unmodifiable(steps),
      deterministic: originalHash == recomputedHash,
      finalOriginalHash: originalHash,
      finalRecomputedHash: recomputedHash,
    );
  }

  /// Returns the step at [stepIndex] by building the timeline and returning that step. No disk write.
  Future<ReplayStep> replayUntil(String executionId, int stepIndex) async {
    final timeline = await buildTimeline(executionId);
    if (stepIndex < 0 || stepIndex >= timeline.steps.length) {
      return ReplayStep(
        stepIndex: stepIndex,
        stepType: StepType.FINAL_RESULT,
        inputState: const {},
        outputState: const {},
        stateHash: '',
        matchesPersistedState: false,
        differences: const [],
      );
    }
    return timeline.steps[stepIndex];
  }

  static Map<String, Object> _copyMap(Map<String, Object> m) =>
      Map<String, Object>.from(m);

  static List<ReplayDifference> _fieldDifferences(
    Map<String, Object> original,
    Map<String, Object> recomputed,
  ) {
    final list = <ReplayDifference>[];
    final allKeys = <String>{...original.keys, ...recomputed.keys};
    for (final k in allKeys) {
      if (k == 'resultHash') continue;
      final a = original[k];
      final b = recomputed[k];
      final aStr = _valueStr(a);
      final bStr = _valueStr(b);
      if (aStr != bStr) {
        list.add(ReplayDifference(
          fieldName: k,
          originalValue: aStr,
          recomputedValue: bStr,
          differenceType: ReplayDifferenceType.FIELD_MISMATCH,
        ));
      }
    }
    return list;
  }

  static String _valueStr(Object? v) {
    if (v == null) return 'null';
    if (v is Map) return _mapStr(v);
    if (v is List) return _listStr(v);
    return v.toString();
  }

  static String _mapStr(Map m) {
    final keys = m.keys.cast<String>().toList()..sort();
    final parts = keys.map((k) => '$k=${_valueStr(m[k])}');
    return parts.join(';');
  }

  static String _listStr(List l) => l.map(_valueStr).join(',');
}
