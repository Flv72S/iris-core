// Phase 11.5.2 — ExplainabilityController replay vs normal rehydration: same store hash, stack, time context.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_controller.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_explainability_replay_equiv_test.jsonl';

Future<void> _populate(PersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(_trace('x')));
  await store.append(TimeContextRecord(sessionId: 'session-1', tick: 1, origin: 'trace'));
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
  test('controller at final step matches rehydrate result', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final rehydrator = PersistenceRehydrator(store: store);
    final fullResult = await rehydrator.rehydrate();

    final controller = ExplainabilityController(store: store);
    await controller.load();
    while (controller.current != null &&
        controller.current!.currentIndex < controller.current!.totalSteps - 1) {
      controller.stepForward();
    }
    final state = controller.current!;
    expect(state.store.computeStoreHash(), fullResult.store.computeStoreHash());
    expect(state.timeContext.currentTime.tick, fullResult.timeContext.currentTime.tick);
    expect(state.timeContext.sessionId.value, fullResult.timeContext.sessionId.value);
    final navFromFull = TraceNavigationController(fullResult.store).computeRouteStack();
    expect(state.navigationStack, navFromFull);
  });
}
