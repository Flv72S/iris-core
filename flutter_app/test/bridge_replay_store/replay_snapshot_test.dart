import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_store_snapshot.dart';
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
  test('snapshot is unmodifiable', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    final snap = store.getSnapshot();
    expect(() => snap.traces.add(tr('b')), throwsUnsupportedError);
  });

  test('snapshot equality', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    final s1 = store.getSnapshot();
    final s2 = store.getSnapshot();
    expect(s1, s2);
    expect(s1.hashCode, s2.hashCode);
  });

  test('snapshot has storeHash', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    final snap = store.getSnapshot();
    expect(snap.storeHash, store.computeStoreHash());
    expect(snap.traces.length, 1);
  });
}
