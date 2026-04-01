import 'dart:io';

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
  test('same input same output', () {
    final s1 = ReplayTraceStore();
    final s2 = ReplayTraceStore();
    s1.save(ValidatedTraceResult(trace: tr('x'), isValid: true, errors: <String>[]));
    s2.save(ValidatedTraceResult(trace: tr('x'), isValid: true, errors: <String>[]));
    expect(s1.computeStoreHash(), s2.computeStoreHash());
    expect(s1.getAll().length, s2.getAll().length);
  });

  test('clear is deterministic', () {
    final store = ReplayTraceStore();
    store.save(ValidatedTraceResult(trace: tr('a'), isValid: true, errors: <String>[]));
    store.clear();
    expect(store.getAll(), isEmpty);
    expect(store.computeStoreHash(), isNotEmpty);
  });

  test('no DateTime.now in replay_store', () {
    final dir = Directory('lib/bridge/replay_store');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('DateTime.now()'), isFalse);
      }
    }
  });

  test('no Random in replay_store', () {
    final dir = Directory('lib/bridge/replay_store');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('Random()'), isFalse);
      }
    }
  });
}
