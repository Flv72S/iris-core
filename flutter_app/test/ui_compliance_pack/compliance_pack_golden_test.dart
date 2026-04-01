// Phase 11.7.1 — Golden byte-level comparison for compliance pack JSON.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack_generator.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_compliance_pack_golden_test.jsonl';

Future<void> _populate(LocalFilePersistenceStore store) async {
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
  test('pack canonical JSON matches golden', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonStr = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final bytes = Uint8List.fromList(utf8.encode(jsonStr));
    final verified = ForensicBundleImporter().importAndVerify(bytes);
    final pack = CompliancePackGenerator().generate(verified);
    final packJson = CompliancePackSerializer.toCanonicalJsonString(pack);
    await expectLater(
      utf8.encode(packJson),
      matchesGoldenFile('golden/compliance_pack.bin'),
    );
  });
}
