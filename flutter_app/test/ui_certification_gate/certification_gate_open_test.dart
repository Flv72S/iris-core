// Phase 11.8.1 — Valid bundle + valid pack → open; child rendered.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_state.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_verifier.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_widget.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack_generator.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_cert_gate_open_test.jsonl';

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
  await store.append(TraceRecord.fromTrace(_trace('g')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  testWidgets('valid bundle and pack yield open and child is rendered',
      (WidgetTester tester) async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonStr = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final bytes = Uint8List.fromList(utf8.encode(jsonStr));
    final verified = ForensicBundleImporter().importAndVerify(bytes);
    final pack = CompliancePackGenerator().generate(verified);

    final result = verifyCertificationGate(bundle: verified, pack: pack);

    expect(result.state, CertificationGateState.open);
    expect(result.reason, 'verified');
    expect(result.bundleHash, verified.verifiedHash);
    expect(result.packHash, pack.packHash);

    await tester.pumpWidget(
      MaterialApp(
        home: CertificationGate(
          result: result,
          child: const SizedBox(key: Key('child')),
        ),
      ),
    );
    expect(find.byKey(const Key('child')), findsOneWidget);
  });
}
