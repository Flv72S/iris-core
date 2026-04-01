// Phase 11.8.1 — Bundle hash != pack reference → closedHashMismatch.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_state.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_verifier.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack_generator.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';

String _tempPathA() =>
    '${Directory.systemTemp.path}/iris_cert_gate_hash_a_test.jsonl';
String _tempPathB() =>
    '${Directory.systemTemp.path}/iris_cert_gate_hash_b_test.jsonl';

DecisionTraceDto _trace(String id) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );

Future<void> _populateA(LocalFilePersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(_trace('a')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

Future<void> _populateB(LocalFilePersistenceStore store) async {
  await store.clearAll();
  await store.append(SessionStartRecord(sessionId: 'session-1'));
  await store.append(TraceRecord.fromTrace(_trace('b')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('pack from bundle A with bundle B yields closedHashMismatch', () async {
    final storeA = LocalFilePersistenceStore(filePath: _tempPathA());
    final storeB = LocalFilePersistenceStore(filePath: _tempPathB());
    await _populateA(storeA);
    await _populateB(storeB);

    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundleA = await builder.build(storeA);
    final bundleB = await builder.build(storeB);
    final jsonStrA = ForensicBundleSerializer.toCanonicalJsonString(bundleA);
    final jsonStrB = ForensicBundleSerializer.toCanonicalJsonString(bundleB);
    final verifiedA = ForensicBundleImporter().importAndVerify(
        Uint8List.fromList(utf8.encode(jsonStrA)));
    final verifiedB = ForensicBundleImporter().importAndVerify(
        Uint8List.fromList(utf8.encode(jsonStrB)));

    final packFromA = CompliancePackGenerator().generate(verifiedA);

    final result = verifyCertificationGate(
      bundle: verifiedB,
      pack: packFromA,
    );

    expect(result.state, CertificationGateState.closedHashMismatch);
    expect(result.reason, 'bundle hash does not match pack reference');
    expect(result.bundleHash, verifiedB.verifiedHash);
    expect(result.packHash, packFromA.packHash);
    expect(verifiedA.verifiedHash, isNot(verifiedB.verifiedHash));
  });
}
