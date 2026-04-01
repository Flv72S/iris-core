// Phase 11.4.2 — Start session, commit trace A, commit trace B: tick 0 then 1 then 2, sessionId invariant.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/time_model/time_context_controller.dart';

DecisionTraceDto trace(String id) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );

void main() {
  test('start session then commit A then B: tick 0 to 1 to 2, sessionId invariant', () async {
    final controller = TimeContextController();
    final ctxStart = await controller.onSessionStart();
    expect(ctxStart.currentTime.tick, 0);
    final sessionId = ctxStart.sessionId.value;

    final ctxA = controller.onTraceCommitted(trace('A'));
    expect(ctxA.currentTime.tick, 1);
    expect(ctxA.sessionId.value, sessionId);

    final ctxB = controller.onTraceCommitted(trace('B'));
    expect(ctxB.currentTime.tick, 2);
    expect(ctxB.sessionId.value, sessionId);
  });

  test('replay same sequence produces same context sequence', () async {
    final c1 = TimeContextController();
    await c1.onSessionStart();
    c1.onTraceCommitted(trace('A'));
    c1.onTraceCommitted(trace('B'));
    final tick1 = c1.current.currentTime.tick;
    final session1 = c1.current.sessionId.value;

    final c2 = TimeContextController();
    await c2.onSessionStart();
    c2.onTraceCommitted(trace('A'));
    c2.onTraceCommitted(trace('B'));
    expect(c2.current.currentTime.tick, tick1);
    expect(c2.current.sessionId.value, session1);
  });
}
