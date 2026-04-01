// Phase 11.6.1 — Golden JSON of bundle; byte-per-byte comparison.

import 'dart:convert';
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
    '${Directory.systemTemp.path}/iris_forensic_golden_test.jsonl';

Future<void> _populate(PersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(DecisionTraceDto(
    traceId: 'golden-trace',
    signals: <String, dynamic>{},
    state: <String, dynamic>{},
    resolution: 'r',
    execution: <String, dynamic>{},
    outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
    timestamp: '1970-01-01T00:00:00Z',
  )));
  await store.append(TimeContextRecord(sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('bundle canonical JSON matches golden', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonString = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    await expectLater(
      utf8.encode(jsonString),
      matchesGoldenFile('golden/forensic_bundle.bin'),
    );
  });
}
