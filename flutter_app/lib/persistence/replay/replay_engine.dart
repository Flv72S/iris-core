// J6 — Replay Engine. Deterministic state reconstruction; read-only.

import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/port/persistence_port.dart';
import 'package:iris_flutter_app/persistence/replay/execution_orchestrator_port.dart';
import 'package:iris_flutter_app/persistence/replay/replay_difference.dart';
import 'package:iris_flutter_app/persistence/replay/replay_difference_type.dart';
import 'package:iris_flutter_app/persistence/replay/replay_result.dart';

/// Reconstructs execution state from persisted records and re-runs orchestrator for verification.
class ReplayEngine {
  ReplayEngine({
    required PersistencePort persistencePort,
    required DeterministicHashEngine hashEngine,
    required ExecutionOrchestratorPort orchestrator,
  })  : _port = persistencePort,
        _engine = hashEngine,
        _orchestrator = orchestrator;

  final PersistencePort _port;
  final DeterministicHashEngine _engine;
  final ExecutionOrchestratorPort _orchestrator;

  /// Replays one execution by [executionId]. No disk write; deterministic.
  Future<ReplayResult> replayExecution(String executionId) async {
    final snapshot = await _port.snapshotStore().getSnapshot(executionId);
    final originalResult = await _port.executionStore().getResult(executionId);

    if (snapshot == null) {
      return ReplayResult(
        executionId: executionId,
        replaySuccessful: false,
        originalHash: '',
        recomputedHash: '',
        differences: [
          ReplayDifference(
            fieldName: 'snapshot',
            originalValue: '',
            recomputedValue: '',
            differenceType: ReplayDifferenceType.MISSING_RECORD,
          ),
        ],
      );
    }

    if (originalResult == null) {
      return ReplayResult(
        executionId: executionId,
        replaySuccessful: false,
        originalHash: '',
        recomputedHash: '',
        differences: [
          ReplayDifference(
            fieldName: 'result',
            originalValue: '',
            recomputedValue: '',
            differenceType: ReplayDifferenceType.MISSING_RECORD,
          ),
        ],
      );
    }

    PersistedExecutionResult recomputedResult;
    try {
      recomputedResult = await _orchestrator.execute(snapshot);
    } catch (_) {
      return ReplayResult(
        executionId: executionId,
        replaySuccessful: false,
        originalHash: originalResult.resultHash,
        recomputedHash: '',
        differences: [
          ReplayDifference(
            fieldName: 'execution',
            originalValue: originalResult.resultHash,
            recomputedValue: '',
            differenceType: ReplayDifferenceType.CORRUPTED_RECORD,
          ),
        ],
      );
    }

    final recomputedHash = HashUtils.hashResult(recomputedResult, _engine);
    final originalHash = originalResult.resultHash;

    if (originalHash == recomputedHash) {
      return ReplayResult(
        executionId: executionId,
        replaySuccessful: true,
        originalHash: originalHash,
        recomputedHash: recomputedHash,
        differences: const [],
      );
    }

    final differences = <ReplayDifference>[
      ReplayDifference(
        fieldName: 'resultHash',
        originalValue: originalHash,
        recomputedValue: recomputedHash,
        differenceType: ReplayDifferenceType.HASH_MISMATCH,
      ),
      ..._fieldDifferences(originalResult.toMap(), recomputedResult.toMap()),
    ];

    return ReplayResult(
      executionId: executionId,
      replaySuccessful: false,
      originalHash: originalHash,
      recomputedHash: recomputedHash,
      differences: differences,
    );
  }

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

  static String _listStr(List l) {
    return l.map(_valueStr).join(',');
  }
}
