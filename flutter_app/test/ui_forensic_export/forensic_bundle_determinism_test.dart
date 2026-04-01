// Phase 11.6.1 — Same store → same bundleHash; double build → byte-identical JSON.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_forensic_determinism_test.jsonl';

Future<void> _populate(PersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(_trace('a')));
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
  test('same store yields same bundleHash', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final b1 = await builder.build(store);
    final b2 = await builder.build(store);
    expect(b2.bundleHash, b1.bundleHash);
  });

  test('double build byte-identical JSON', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final b1 = await builder.build(store);
    final b2 = await builder.build(store);
    final s1 = ForensicBundleSerializer.toCanonicalJsonString(b1);
    final s2 = ForensicBundleSerializer.toCanonicalJsonString(b2);
    expect(s2, s1);
  });
}
