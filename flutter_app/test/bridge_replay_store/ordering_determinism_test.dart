import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';

DecisionTraceDto tr(String id) => DecisionTraceDto(
      traceId: id,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );

void main() {
  test('insert out of order getAll returns lexicographic by traceId', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('z'), isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: tr('m'), isValid: true, errors: <String>[]));
    final list = store.getAll();
    expect(list.map((t) => t.traceId).toList(), <String>['a', 'm', 'z']);
  });

  test('same input same order', () {
    final store = ReplayTraceStore();
    for (final id in ['c', 'a', 'b']) {
      store.save(ValidatedTraceResult(trace: tr(id), isValid: true, errors: <String>[]));
    }
    expect(store.getAll().map((t) => t.traceId).toList(), <String>['a', 'b', 'c']);
  });
}
