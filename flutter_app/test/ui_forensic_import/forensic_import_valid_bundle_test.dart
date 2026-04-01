// Phase 11.6.2 — Import valid bundle → VerifiedForensicBundle; replay coherent.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/forensic_bundle_importer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_forensic_import_valid_test.jsonl';

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
  await store.append(TraceRecord.fromTrace(_trace('a')));
  await store.append(TimeContextRecord(
      sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('import valid bundle returns VerifiedForensicBundle with coherent replay',
      () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    final jsonStr =
        ForensicBundleSerializer.toCanonicalJsonString(bundle);
    final bytes = Uint8List.fromList(utf8.encode(jsonStr));

    final importer = ForensicBundleImporter();
    final verified = importer.importAndVerify(bytes);

    expect(verified.bundle.bundleVersion, bundle.bundleVersion);
    expect(verified.verifiedHash, bundle.bundleHash);
    expect(verified.recordCount, 3);
    expect(verified.sessionId, 'session-1');
    expect(verified.finalTimeContext.currentTime.tick, 1);
    expect(verified.finalTimeContext.currentTime.origin, 'trace');

    final rehydrator = PersistenceRehydrator(store: store);
    final liveResult = await rehydrator.rehydrate();
    expect(verified.finalStoreHash, liveResult.store.computeStoreHash());
    final liveStack =
        TraceNavigationController(liveResult.store).computeRouteStack();
    final replayStore = verified.bundle.records;
    final replayed =
        rehydrator.rehydrateFromRecords(replayStore);
    final replayStack =
        TraceNavigationController(replayed.store).computeRouteStack();
    expect(replayStack, liveStack);
  });
}
