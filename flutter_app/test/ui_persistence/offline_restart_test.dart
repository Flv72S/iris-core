// Phase 11.5.1 — Write, then new instance, reload persistence → same UI state.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/time_model/time_context_controller.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

String tempPath() =>
    '${Directory.systemTemp.path}/iris_persistence_offline_restart_test.jsonl';

void main() {
  test('write then new instance reload yields same store hash and time', () async {
    final path = tempPath();
    final store1 = LocalFilePersistenceStore(filePath: path);
    await store1.clearAll();

    final replayStore1 = ReplayTraceStore();
    final notifier1 = DecisionLoopNotifier();
    final timeController1 = TimeContextController(persistenceStore: store1);
    await timeController1.onSessionStart();
    final controller1 = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: replayStore1,
      notifier: notifier1,
      timeContextController: timeController1,
      persistenceStore: store1,
    );
    await controller1.executeAction(const ActionIntent(
      intentId: 'i1',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    ));
    final hash1 = replayStore1.computeStoreHash();
    final tick1 = timeController1.current.currentTime.tick;

    final store2 = LocalFilePersistenceStore(filePath: path);
    final rehydrator = PersistenceRehydrator(store: store2);
    final result = await rehydrator.rehydrate();

    expect(result.store.computeStoreHash(), hash1);
    expect(result.timeContext.currentTime.tick, tick1);
  });
}
