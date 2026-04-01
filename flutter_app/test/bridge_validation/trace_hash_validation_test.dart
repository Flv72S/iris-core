import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

DecisionTraceDto tr({String traceId = 't1'}) => DecisionTraceDto(
      traceId: traceId,
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'res',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '2025-01-01T00:00:00Z',
    );

void main() {
  test('same payload hash valid', () {
    final v = TraceValidator();
    final t = tr();
    final h = computeDeterministicHash(t.toJson());
    expect(v.validateHash(t, h), isEmpty);
  });
  test('altered payload FAIL', () {
    final v = TraceValidator();
    final t = tr();
    final h = computeDeterministicHash(t.toJson());
    expect(v.validateHash(tr(traceId: 'x'), h), isNotEmpty);
  });
  test('null expectedHash no error', () {
    expect(TraceValidator().validateHash(tr(), null), isEmpty);
  });
}
