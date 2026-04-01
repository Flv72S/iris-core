// Phase 11.5.2 — stepForward N times: TimeContext and Navigation coherent; stepBackward restores.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_controller.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_explainability_step_test.jsonl';

Future<void> _populate(PersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(_trace('a')));
  await store.append(TimeContextRecord(sessionId: 'session-1', tick: 1, origin: 'trace'));
  await store.append(TraceRecord.fromTrace(_trace('b')));
  await store.append(TimeContextRecord(sessionId: 'session-1', tick: 2, origin: 'trace'));
}

DecisionTraceDto _trace(String id) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );

void main() {
  test('stepForward then stepBackward restores state', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final controller = ExplainabilityController(store: store);
    await controller.load();
    final state0 = controller.current!;
    expect(state0.currentIndex, 0);

    controller.stepForward();
    controller.stepForward();
    final state2 = controller.current!;
    expect(state2.currentIndex, 2);
    expect(state2.timeContext.currentTime.tick, 1);

    controller.stepBackward();
    final state1 = controller.current!;
    expect(state1.currentIndex, 1);
    controller.stepBackward();
    expect(controller.current!.currentIndex, 0);
  });
}
