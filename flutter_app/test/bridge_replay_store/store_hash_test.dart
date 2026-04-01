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
  test('same content same hash', () {
    final s1 = ReplayTraceStore();
    final s2 = ReplayTraceStore();
    s1.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    s1.save(ValidatedTraceResult(trace: tr('b'), isValid: true, errors: <String>[]));
    s2.save(ValidatedTraceResult(trace: tr('b'), isValid: true, errors: <String>[]));
    s2.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    expect(s1.computeStoreHash(), s2.computeStoreHash());
  });

  test('different content different hash', () {
    final s1 = ReplayTraceStore();
    final s2 = ReplayTraceStore();
    s1.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    s2.save(ValidatedTraceResult(trace: tr('b'), isValid: true, errors: <String>[]));
    expect(s1.computeStoreHash(), isNot(s2.computeStoreHash()));
  });

  test('store hash is SHA-256 hex', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('x'), isValid: true, errors: <String>[]));
    final h = store.computeStoreHash();
    expect(h.length, 64);
    expect(RegExp(r'^[a-f0-9]+$').hasMatch(h), isTrue);
  });
}
