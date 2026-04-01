// Phase 11.7.1 — Same bundle → byte-identical pack.

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
    '${Directory.systemTemp.path}/iris_compliance_pack_determinism_test.jsonl';

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
  await store.append(TraceRecord.fromTrace(_trace('c')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('same bundle yields byte-identical canonical pack JSON', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonStr = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final bytes = Uint8List.fromList(utf8.encode(jsonStr));
    final verified = ForensicBundleImporter().importAndVerify(bytes);

    final generator = CompliancePackGenerator();
    final pack1 = generator.generate(verified);
    final pack2 = generator.generate(verified);

    final s1 = CompliancePackSerializer.toCanonicalJsonString(pack1);
    final s2 = CompliancePackSerializer.toCanonicalJsonString(pack2);
    expect(s1, s2);
    expect(utf8.encode(s1), utf8.encode(s2));
    expect(pack1.packHash, pack2.packHash);
  });
}
