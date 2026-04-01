// Phase 11.5.2 — Load persistence with N records; initial state coherent; index 0.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_controller.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_explainability_load_test.jsonl';

PersistenceStore _storeWithNRecords(int n) => LocalFilePersistenceStore(filePath: _tempPath());

Future<void> _populate(PersistenceStore store, int count) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  for (var i = 0; i < count; i++) {
    await store.append(TraceRecord.fromTrace(_trace('t$i')));
    await store.append(TimeContextRecord(sessionId: 'session-1', tick: i + 1, origin: 'trace'));
  }
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
  test('load persistence with N records state coherent index 0', () async {
    final store = _storeWithNRecords(3);
    await _populate(store, 2);
    final controller = ExplainabilityController(store: store);
    await controller.load();
    final state = controller.current;
    expect(state, isNotNull);
    expect(state!.currentIndex, 0);
    expect(state.records.length, 5);
    expect(state.totalSteps, 5);
    expect(state.timeContext.sessionId.value, 'session-0');
    expect(state.currentRecord, equals(state.records[0]));
  });
}
