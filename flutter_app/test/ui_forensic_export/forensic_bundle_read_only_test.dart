// Phase 11.6.1 — No append; store not mutated.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_forensic_readonly_test.jsonl';

void main() {
  test('build does not call append', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await store.clearAll();
    await store.append(SessionStartRecord(sessionId: 'session-1'));
    await store.append(TraceRecord.fromTrace(DecisionTraceDto(
      traceId: 't',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    )));
    await store.append(TimeContextRecord(sessionId: 'session-1', tick: 1, origin: 'trace'));
    final countBefore = (await store.loadAll()).length;
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    await builder.build(store);
    final countAfter = (await store.loadAll()).length;
    expect(countAfter, countBefore);
  });

  test('forensic_export source has no store.append', () {
    final dir = Directory('lib/ui/forensic_export');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        final content = f.readAsStringSync();
        expect(
          content.contains('store.append') || content.contains('store!.append'),
          isFalse,
          reason: '${f.path} read-only',
        );
      }
    }
  });
}
