// Phase 11.6.1 — Bundle replay yields same store hash and time context as live.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_writer.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_forensic_replay_test.jsonl';
String _bundlePath() =>
    '${Directory.systemTemp.path}/iris_forensic_replay_bundle.irisbundle.json';

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
  await store.append(TimeContextRecord(sessionId: 'session-1', tick: 1, origin: 'trace'));
}

void main() {
  test('bundle replay same store hash and time context as live', () async {
    final store = LocalFilePersistenceStore(filePath: _tempPath());
    await _populate(store);
    final rehydrator = PersistenceRehydrator(store: store);
    final liveResult = await rehydrator.rehydrate();

    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    final bundle = await builder.build(store);
    await ForensicBundleWriter.write(bundle, _bundlePath());

    final fileContent = await File(_bundlePath()).readAsString(encoding: utf8);
    final parsed = jsonDecode(fileContent) as Map<String, dynamic>;
    final loadedBundle = ForensicBundle.fromJson(parsed);
    final replayResult = rehydrator.rehydrateFromRecords(loadedBundle.records);

    expect(replayResult.store.computeStoreHash(), liveResult.store.computeStoreHash());
    expect(replayResult.timeContext.sessionId.value, liveResult.timeContext.sessionId.value);
    expect(replayResult.timeContext.currentTime.tick, liveResult.timeContext.currentTime.tick);
    final liveStack = TraceNavigationController(liveResult.store).computeRouteStack();
    final replayStack = TraceNavigationController(replayResult.store).computeRouteStack();
    expect(replayStack, liveStack);
  });
}
