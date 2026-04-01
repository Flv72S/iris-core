// Phase 11.4.2 / 11.5.1 — Holds current TimeContext. Updates only on explicit session start or trace commit.

import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

import 'logical_time.dart';
import 'session_id.dart';
import 'time_context.dart';

/// Maintains current TimeContext. Logical time advances only on trace committed; session only on explicit start.
class TimeContextController {
  TimeContextController({PersistenceStore? persistenceStore})
      : _current = const TimeContext(
          sessionId: SessionId('session-0'),
          currentTime: LogicalTime.initial,
        ),
        _nextSessionNumber = 1,
        _persistenceStore = persistenceStore;

  TimeContext _current;
  int _nextSessionNumber;
  final PersistenceStore? _persistenceStore;

  /// Current context. Never null.
  TimeContext get current => _current;

  /// Explicit session start. Returns new context with new SessionId and tick 0.
  Future<TimeContext> onSessionStart() async {
    _current = TimeContext(
      sessionId: SessionId('session-$_nextSessionNumber'),
      currentTime: LogicalTime.initial,
    );
    if (_persistenceStore != null) {
      await _persistenceStore!.append(SessionStartRecord(sessionId: _current.sessionId.value));
    }
    _nextSessionNumber += 1;
    return _current;
  }

  /// Call only after a trace has been committed. Advances logical time by one tick. Session unchanged.
  TimeContext onTraceCommitted(DecisionTraceDto trace) {
    _current = TimeContext(
      sessionId: _current.sessionId,
      currentTime: _current.currentTime.next(origin: 'trace'),
    );
    return _current;
  }

  /// Restore state after persistence rehydration. No inference.
  void rehydrate(TimeContext context, int nextSessionNumber) {
    _current = context;
    _nextSessionNumber = nextSessionNumber;
  }
}
