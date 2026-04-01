// Phase 11.4.1 — Same intent twice → same traceId, storeHash, stack. No client decision logic.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_host.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

void main() {
  testWidgets('same intent twice yields same traceId storeHash and stack', (tester) async {
    final store1 = ReplayTraceStore();
    final notifier1 = DecisionLoopNotifier();
    final controller1 = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: store1,
      notifier: notifier1,
    );
    const intent = ActionIntent(
      intentId: 'i1',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    );

    final result1 = await controller1.executeAction(intent);
    expect(result1.isSuccess, isTrue);
    expect(result1.traceId, 'stub-trace-1');
    final hash1 = result1.storeHashAfterSave;
    final stack1 = store1.getAll();

    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: TraceNavigationHost(store: store1, notifier: notifier1),
      ),
    );
    final pagesCount1 = store1.getAll().length;

    // Reset: new store and controller, same intent
    final store2 = ReplayTraceStore();
    final notifier2 = DecisionLoopNotifier();
    final controller2 = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: store2,
      notifier: notifier2,
    );
    final result2 = await controller2.executeAction(intent);
    expect(result2.isSuccess, isTrue);
    expect(result2.traceId, result1.traceId);
    expect(result2.storeHashAfterSave, hash1);
    final stack2 = store2.getAll();
    expect(stack2.length, stack1.length);
    expect(stack2[0].traceId, stack1[0].traceId);

    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: TraceNavigationHost(store: store2, notifier: notifier2),
      ),
    );
    expect(store2.getAll().length, pagesCount1);
  });
}
