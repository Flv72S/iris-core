// Phase 11.4.2 — Same intents, same traces, same store → same logical time sequence.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/time_model/time_context_controller.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

void main() {
  test('same intents and store produce same logical time sequence', () async {
    const intent = ActionIntent(
      intentId: 'i1',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    );

    final store1 = ReplayTraceStore();
    final notifier1 = DecisionLoopNotifier();
    final timeController1 = TimeContextController();
    await timeController1.onSessionStart();
    final controller1 = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: store1,
      notifier: notifier1,
      timeContextController: timeController1,
    );

    await controller1.executeAction(intent);
    await controller1.executeAction(intent);
    final tick1 = timeController1.current.currentTime.tick;
    final session1 = timeController1.current.sessionId.value;
    final hash1 = store1.computeStoreHash();

    final store2 = ReplayTraceStore();
    final notifier2 = DecisionLoopNotifier();
    final timeController2 = TimeContextController();
    await timeController2.onSessionStart();
    final controller2 = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: store2,
      notifier: notifier2,
      timeContextController: timeController2,
    );

    await controller2.executeAction(intent);
    await controller2.executeAction(intent);
    final tick2 = timeController2.current.currentTime.tick;
    final session2 = timeController2.current.sessionId.value;
    final hash2 = store2.computeStoreHash();

    expect(tick2, tick1);
    expect(session2, session1);
    expect(hash2, hash1);
  });
}
