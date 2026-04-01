import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_host.dart';
import '../_infrastructure/golden_test_config.dart';

DecisionTraceDto tr(String id, String resolution) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: resolution,
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '2025-01-01T00:00:00Z',
    );

void main() {
  testWidgets('golden stack 1 trace', (tester) async {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('t1', 'explainability'), isValid: true, errors: <String>[]));
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: TraceNavigationHost(store: store),
        ),
      ),
    );
    await expectLater(
      find.byType(TraceNavigationHost),
      matchesGoldenFile('golden/trace_nav_1.png'),
    );
  });

  testWidgets('golden stack 3 traces', (tester) async {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a', 'explainability'), isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: tr('b', 'explainability'), isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: tr('c', 'explainability'), isValid: true, errors: <String>[]));
    await tester.pumpWidget(
      MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
          home: TraceNavigationHost(store: store),
        ),
      ),
    );
    await expectLater(
      find.byType(TraceNavigationHost),
      matchesGoldenFile('golden/trace_nav_3.png'),
    );
  });
}
