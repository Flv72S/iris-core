// Phase 11.4.1 — Same intent N times: no inconsistent duplicates, store and navigation invariant.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/stub_intent_channel.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_host.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

void main() {
  testWidgets('N identical intents leave store and navigation invariant', (tester) async {
    final store = ReplayTraceStore();
    final notifier = DecisionLoopNotifier();
    final controller = DecisionLoopController(
      channel: StubIntentChannel(),
      validator: TraceValidator(),
      store: store,
      notifier: notifier,
    );
    const intent = ActionIntent(
      intentId: 'idem',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    );

    const n = 5;
    for (var i = 0; i < n; i++) {
      final result = await controller.executeAction(intent);
      expect(result.isSuccess, isTrue);
    }

    expect(store.getAll().length, 1);
    expect(store.getAll().single.traceId, 'stub-trace-1');
    final hash = store.computeStoreHash();

    await tester.pumpWidget(
      MaterialApp(
        home: TraceNavigationHost(store: store, notifier: notifier),
      ),
    );
    expect(find.byType(TraceNavigationHost), findsOneWidget);

    // Run again: store unchanged
    await controller.executeAction(intent);
    expect(store.getAll().length, 1);
    expect(store.computeStoreHash(), hash);
  });
}
