// Phase 11.5.1 — Start session, intent A, intent B, restart (clear in-memory), rehydrate → same store, time, stack.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/persistence/local_file_persistence_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/time_model/time_context_controller.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

String _tempPath() =>
    '${Directory.systemTemp.path}/iris_persistence_replay_test.jsonl';

void main() {
  test('session then intent A then B, rehydrate yields same store and time context', () async {
    final path = _tempPath();
    final persistenceStore = LocalFilePersistenceStore(filePath: path);
    await persistenceStore.clearAll();

    final store = ReplayTraceStore();
    final notifier = DecisionLoopNotifier();
    final timeController = TimeContextController(persistenceStore: persistenceStore);
    await timeController.onSessionStart();
    final controller = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: store,
      notifier: notifier,
      timeContextController: timeController,
      persistenceStore: persistenceStore,
    );

    const intentA = ActionIntent(
      intentId: 'a',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    );
    const intentB = ActionIntent(
      intentId: 'b',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    );
    await controller.executeAction(intentA);
    await controller.executeAction(intentB);

    final hashBefore = store.computeStoreHash();
    final tickBefore = timeController.current.currentTime.tick;
    final sessionBefore = timeController.current.sessionId.value;
    final navController = TraceNavigationController(store);
    final stackBefore = navController.computeRouteStack();

    final rehydrator = PersistenceRehydrator(store: persistenceStore);
    final result = await rehydrator.rehydrate();

    expect(result.store.computeStoreHash(), hashBefore);
    expect(result.timeContext.currentTime.tick, tickBefore);
    expect(result.timeContext.sessionId.value, sessionBefore);
    expect(result.store.getAll().length, stackBefore.length);
  });
}
