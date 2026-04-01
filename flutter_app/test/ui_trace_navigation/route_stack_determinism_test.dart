import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

DecisionTraceDto tr(String id, String resolution) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: resolution,
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );

void main() {
  test('same traces same stack', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a', 'explainability'), isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: tr('b', 'unknown'), isValid: true, errors: <String>[]));
    final c = TraceNavigationController(store);
    final s1 = c.computeRouteStack();
    final s2 = c.computeRouteStack();
    expect(s1, s2);
    expect(s1, ['explainability', 'unknown_trace']);
  });

  test('order insertion different same result by store order', () {
    final store1 = ReplayTraceStore();
    store1.save(ValidatedTraceResult(trace: tr('z', 'explainability'), isValid: true, errors: <String>[]));
    store1.save(ValidatedTraceResult(trace: tr('a', 'explainability'), isValid: true, errors: <String>[]));
    final store2 = ReplayTraceStore();
    store2.save(ValidatedTraceResult(trace: tr('a', 'explainability'), isValid: true, errors: <String>[]));
    store2.save(ValidatedTraceResult(trace: tr('z', 'explainability'), isValid: true, errors: <String>[]));
    final c1 = TraceNavigationController(store1);
    final c2 = TraceNavigationController(store2);
    expect(c1.computeRouteStack(), c2.computeRouteStack());
  });

  test('rebuild invariant', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('x', 'explainability'), isValid: true, errors: <String>[]));
    final c = TraceNavigationController(store);
    for (var i = 0; i < 5; i++) {
      expect(c.computeRouteStack(), ['explainability']);
      expect(c.computeTopRoute(), 'explainability');
    }
  });
}
