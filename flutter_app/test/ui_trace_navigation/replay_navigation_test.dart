import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_host.dart';

DecisionTraceDto tr(String id, String res) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: res,
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );

void main() {
  testWidgets('N traces controller correct', (tester) async {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a', 'explainability'), isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: tr('b', 'explainability'), isValid: true, errors: <String>[]));
    final c = TraceNavigationController(store);
    expect(c.computeRouteStack().length, 2);
    expect(c.computeTopRoute(), 'explainability');
    expect(c.canPop(), isTrue);
  });
  testWidgets('Host builds and shows content', (tester) async {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a', 'explainability'), isValid: true, errors: <String>[]));
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: TraceNavigationHost(store: store),
      ),
    );
    expect(find.byType(TraceNavigationHost), findsOneWidget);
    expect(find.byType(Scaffold), findsWidgets);
  });
  testWidgets('empty store No traces', (tester) async {
    final store = ReplayTraceStore();
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: TraceNavigationHost(store: store),
      ),
    );
    expect(find.text('No traces'), findsOneWidget);
  });
}
