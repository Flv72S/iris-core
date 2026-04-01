import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_store_exception.dart';
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
  test('save valid trace then getAll', () {
    final store = ReplayTraceStore();
    final result = ValidatedTraceResult(trace: tr('t1'), isValid: true, errors: <String>[]);
    store.save(result);
    expect(store.getAll().length, 1);
    expect(store.getAll().single.traceId, 't1');
  });

  test('getByTraceId returns correct trace', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    expect(store.getByTraceId('a')?.traceId, 'a');
    expect(store.getByTraceId('b'), isNull);
  });

  test('save invalid trace throws', () {
    final store = ReplayTraceStore();
    final result = ValidatedTraceResult(trace: tr('t1'), isValid: false, errors: <String>['err']);
    expect(() => store.save(result), throwsA(isA<ReplayStoreException>()));
    expect(store.getAll(), isEmpty);
  });

  test('duplicate traceId same content idempotent', () {
    final store = ReplayTraceStore();
    final t = tr('t1');
    store.save(ValidatedTraceResult(trace: t, isValid: true, errors: <String>[]));
    store.save(ValidatedTraceResult(trace: t, isValid: true, errors: <String>[]));
    expect(store.getAll().length, 1);
  });

  test('duplicate traceId inconsistent throws', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('t1'), isValid: true, errors: <String>[]));
    final other = DecisionTraceDto(
      traceId: 't1',
      signals: <String, dynamic>{'x': 1},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );
    expect(
      () => store.save(ValidatedTraceResult(trace: other, isValid: true, errors: <String>[])),
      throwsA(isA<ReplayStoreException>()),
    );
  });
}
