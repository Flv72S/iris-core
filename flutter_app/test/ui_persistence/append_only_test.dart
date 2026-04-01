// Phase 11.5.1 — Append multiple preserves order; no overwrite; same record idempotent.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_persistence_append_test.jsonl';

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
  late PersistenceStore store;

  setUp(() async {
    store = LocalFilePersistenceStore(filePath: _tempPath());
    await store.clearAll();
  });

  test('append multiple preserves order', () async {
    await store.append(TraceRecord.fromTrace(trace('a')));
    await store.append(TraceRecord.fromTrace(trace('b')));
    await store.append(SessionStartRecord(sessionId: 'session-1'));
    final list = await store.loadAll();
    expect(list.length, 3);
    expect((list[0] as TraceRecord).recordId, 'a');
    expect((list[1] as TraceRecord).recordId, 'b');
    expect((list[2] as SessionStartRecord).sessionId, 'session-1');
  });

  test('same record idempotent', () async {
    final rec = TraceRecord.fromTrace(trace('x'));
    await store.append(rec);
    await store.append(rec);
    final list = await store.loadAll();
    expect(list.length, 1);
    expect((list[0] as TraceRecord).recordId, 'x');
  });

  test('same recordId different content throws', () async {
    await store.append(TraceRecord.fromTrace(trace('id')));
    final other = DecisionTraceDto(
      traceId: 'id',
      signals: <String, dynamic>{},
      state: <String, dynamic>{'k': 'v'},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );
    expect(
      () async => await store.append(TraceRecord.fromTrace(other)),
      throwsA(isA<PersistenceException>()),
    );
  });
}
