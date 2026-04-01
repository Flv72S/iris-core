// Phase 11.4.1 — Invalid trace: not saved, notifier not updated, navigation unchanged.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/intent_channel.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/intents/mode_change_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_host.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

/// Returns a trace with empty resolution so structure validation fails.
class InvalidTraceChannel implements IntentChannel {
  @override
  Future<DecisionTraceDto> sendAction(ActionIntent intent) async => _invalidTrace();

  @override
  Future<DecisionTraceDto> sendModeChange(ModeChangeIntent intent) async => _invalidTrace();

  static DecisionTraceDto _invalidTrace() {
    return DecisionTraceDto(
      traceId: 'invalid-trace',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: '',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );
  }
}

void main() {
  testWidgets('invalid trace not saved notifier not updated result isSuccess false', (tester) async {
    final store = ReplayTraceStore();
    final notifier = DecisionLoopNotifier();
    final beforeHash = store.computeStoreHash();
    final controller = DecisionLoopController(
      channel: InvalidTraceChannel(),
      validator: TraceValidator(),
      store: store,
      notifier: notifier,
    );
    const intent = ActionIntent(
      intentId: 'x',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    );

    final result = await controller.executeAction(intent);
    expect(result.isSuccess, isFalse);
    expect(result.errors, isNotEmpty);
    expect(store.getAll(), isEmpty);
    expect(store.computeStoreHash(), beforeHash);
    expect(notifier.value, 0);

    await tester.pumpWidget(
      MaterialApp(
        home: TraceNavigationHost(store: store, notifier: notifier),
      ),
    );
    expect(find.text('No traces'), findsOneWidget);
  });
}
