// Phase 11.5.1 — Loaded records not mutable; modification does not affect replay.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

String tempPath() =>
    '${Directory.systemTemp.path}/iris_persistence_immutability_test.jsonl';

void main() {
  test('TraceRecord traceJson is copy', () {
    final t = DecisionTraceDto(
      traceId: 't1',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );
    final rec = TraceRecord.fromTrace(t);
    final json = Map<String, dynamic>.from(rec.traceJson);
    expect(json['traceId'], 't1');
    json['traceId'] = 'modified';
    expect(rec.traceJson['traceId'], 't1');
  });

  test('loadAll returns records with consistent contentHash', () async {
    final store = LocalFilePersistenceStore(filePath: tempPath());
    await store.clearAll();
    await store.append(SessionStartRecord(sessionId: 'session-1'));
    final list = await store.loadAll();
    expect(list.length, 1);
    final rec = list[0] as SessionStartRecord;
    expect(rec.sessionId, 'session-1');
    final hash1 = rec.contentHash;
    final hash2 = SessionStartRecord(sessionId: 'session-1').contentHash;
    expect(hash2, hash1);
  });
}
