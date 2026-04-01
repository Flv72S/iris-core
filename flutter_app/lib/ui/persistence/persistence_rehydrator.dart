// Phase 11.5.1 — Load, validate, rebuild store and time context. No silent skip; invalid = fail.

import 'package:iris_flutter_app/bridge/contracts/bridge_contract.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';
import 'package:iris_flutter_app/ui/time_model/session_id.dart';
import 'package:iris_flutter_app/ui/time_model/time_context.dart';

import 'persistence_record.dart';
import 'persistence_store.dart';

/// Result of rehydration: store, current time context, next session number for controller.
class RehydrationResult {
  const RehydrationResult({
    required this.store,
    required this.timeContext,
    required this.nextSessionNumber,
  });

  final ReplayTraceStore store;
  final TimeContext timeContext;
  final int nextSessionNumber;
}

/// Loads records, validates, rebuilds ReplayTraceStore and TimeContext. Fails on first invalid record.
class PersistenceRehydrator {
  PersistenceRehydrator({
    required PersistenceStore store,
    TraceValidator? validator,
  })  : _store = store,
        _validator = validator ?? TraceValidator();

  final PersistenceStore _store;
  final TraceValidator _validator;

  /// Loads all records, validates each, rebuilds store and time context. Throws on invalid record.
  Future<RehydrationResult> rehydrate() async {
    final records = await _store.loadAll();
    return rehydrateFromRecords(records);
  }

  /// Rehydrates from a sublist of records. Deterministic. Used by ExplainabilityController for step replay.
  RehydrationResult rehydrateFromRecords(List<PersistenceRecord> records) {
    final replayStore = ReplayTraceStore();
    TimeContext currentContext = const TimeContext(
      sessionId: SessionId('session-0'),
      currentTime: LogicalTime.initial,
    );
    var nextSessionNumber = 1;

    for (final record in records) {
      if (record is TraceRecord) {
        final trace = DecisionTraceDto.fromJson(
          Map<String, dynamic>.from(record.traceJson),
        );
        final validated = _validator.validateAll(
          trace,
          contractVersion: irisBridgeContractVersion,
        );
        if (!validated.isValid) {
          throw PersistenceException(
            'invalid trace record ${record.recordId}: ${validated.errors.join('; ')}',
          );
        }
        replayStore.save(ValidatedTraceResult(
          trace: trace,
          isValid: true,
          errors: const <String>[],
        ));
      } else if (record is TimeContextRecord) {
        currentContext = TimeContext(
          sessionId: SessionId(record.sessionId),
          currentTime: LogicalTime(tick: record.tick, origin: record.origin),
        );
      } else if (record is SessionStartRecord) {
        nextSessionNumber = _nextSessionFrom(record.sessionId, nextSessionNumber);
      }
    }

    return RehydrationResult(
      store: replayStore,
      timeContext: currentContext,
      nextSessionNumber: nextSessionNumber,
    );
  }

  int _nextSessionFrom(String sessionIdValue, int currentNext) {
    final match = RegExp(r'session-(\d+)').firstMatch(sessionIdValue);
    if (match == null) return currentNext;
    final n = int.parse(match.group(1)!);
    final next = n + 1;
    return next > currentNext ? next : currentNext;
  }
}
