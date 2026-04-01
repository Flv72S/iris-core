// Phase 11.6.2 — Bundle with altered bytes → HashMismatchException.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_import_exceptions.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_forensic_import_hash_test.jsonl';

DecisionTraceDto _trace(String id) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );

Future<void> _populate(LocalFilePersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(_trace('x')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('bundle with tampered content throws HashMismatchException', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonStr =
        ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final decoded = jsonDecode(jsonStr) as Map<String, dynamic>;
    decoded['bundleHash'] = '0' * 64;
    final tamperedStr = jsonEncode(decoded);
    final bytes = Uint8List.fromList(utf8.encode(tamperedStr));

    final importer = ForensicBundleImporter();
    expect(
      () => importer.importAndVerify(bytes),
      throwsA(isA<HashMismatchException>()),
    );
  });
}
