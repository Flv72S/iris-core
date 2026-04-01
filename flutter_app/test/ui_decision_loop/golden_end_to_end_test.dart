// Phase 11.4.1 — Golden snapshot after 1 intent and 3 intents. Replay UI stable.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/channel/intent_channel.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/intents/action_intent.dart';
import 'package:iris_flutter_app/bridge/intents/mode_change_intent.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_controller.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_host.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';
import '../_infrastructure/golden_test_config.dart';

/// Deterministic: same intentId → same trace. Different intentIds → different traces.
class SequentialTraceChannel implements IntentChannel {
  @override
  Future<DecisionTraceDto> sendAction(ActionIntent intent) async {
    final id = intent.intentId;
    return DecisionTraceDto(
      traceId: 'seq-$id',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'stub',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );
  }

  @override
  Future<DecisionTraceDto> sendModeChange(ModeChangeIntent intent) async {
    return DecisionTraceDto(
      traceId: 'seq-m-${intent.targetModeId}',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'stub',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );
  }
}

void main() {
  testWidgets('golden UI after 1 intent', (tester) async {
    final store = ReplayTraceStore();
    final notifier = DecisionLoopNotifier();
    final controller = DecisionLoopController(
      channel: SequentialTraceChannel(),
      validator: TraceValidator(),
      store: store,
      notifier: notifier,
    );
    await controller.executeAction(const ActionIntent(
      intentId: '1',
      actionType: 'test',
      parameters: <String, dynamic>{},
      timestamp: '1970-01-01T00:00:00Z',
    ));

    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: TraceNavigationHost(store: store, notifier: notifier),
        ),
      ),
    );
    await expectLater(
      find.byType(TraceNavigationHost),
      matchesGoldenFile('golden/decision_loop_1.png'),
    );
  });

  testWidgets('golden UI after 3 intents sequential', (tester) async {
    final store = ReplayTraceStore();
    final notifier = DecisionLoopNotifier();
    final controller = DecisionLoopController(
      channel: SequentialTraceChannel(),
      validator: TraceValidator(),
      store: store,
      notifier: notifier,
    );
    for (var i = 1; i <= 3; i++) {
      await controller.executeAction(ActionIntent(
        intentId: '$i',
        actionType: 'test',
        parameters: <String, dynamic>{},
        timestamp: '1970-01-01T00:00:00Z',
      ));
    }

    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: TraceNavigationHost(store: store, notifier: notifier),
        ),
      ),
    );
    await expectLater(
      find.byType(TraceNavigationHost),
      matchesGoldenFile('golden/decision_loop_3.png'),
    );
  });
}
