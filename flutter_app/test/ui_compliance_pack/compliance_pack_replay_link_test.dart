// Phase 11.7.1 — Pack ↔ forensic bundle ↔ replay coherent.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack_generator.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_compliance_pack_replay_link_test.jsonl';

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
  await store.append(TraceRecord.fromTrace(_trace('e')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('pack generatedFromBundleHash and storeHash match live replay', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final rehydrator = PersistenceRehydrator(store: store);
    final liveResult = await rehydrator.rehydrate();

    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonStr = ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final bytes = Uint8List.fromList(utf8.encode(jsonStr));
    final verified = ForensicBundleImporter().importAndVerify(bytes);

    final pack = CompliancePackGenerator().generate(verified);

    expect(pack.generatedFromBundleHash, bundle.bundleHash);
    expect(pack.generatedFromBundleHash, verified.verifiedHash);
    expect(verified.finalStoreHash, liveResult.store.computeStoreHash());

    final replayed = rehydrator.rehydrateFromRecords(verified.bundle.records);
    final liveStack = TraceNavigationController(liveResult.store).computeRouteStack();
    final replayStack = TraceNavigationController(replayed.store).computeRouteStack();
    expect(replayStack, liveStack);
  });
}
