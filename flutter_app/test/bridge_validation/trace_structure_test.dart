import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validation_exception.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';

void main() {
  late TraceValidator v;
  setUp(() => v = TraceValidator());

  test('valid trace PASS', () {
    final t = DecisionTraceDto(
      traceId: 't1',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'res',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '2025-01-01T00:00:00Z',
    );
    expect(v.validateStructure(t), isEmpty);
  });

  test('valid map PASS', () {
    final json = <String, dynamic>{
      'traceId': 't1', 'signals': <String, dynamic>{}, 'state': <String, dynamic>{},
      'resolution': 'r', 'execution': <String, dynamic>{},
      'outcome': <String, dynamic>{'status': 's', 'effects': <dynamic>[]},
      'timestamp': 'ts',
    };
    expect(v.validateStructureFromMap(json), isEmpty);
  });

  test('missing field FAIL', () {
    final json = <String, dynamic>{
      'traceId': 't1', 'signals': <String, dynamic>{}, 'state': <String, dynamic>{},
      'resolution': 'r', 'execution': <String, dynamic>{},
      'outcome': <String, dynamic>{'status': 's', 'effects': <dynamic>[]},
    };
    final err = v.validateStructureFromMap(json);
    expect(err, isNotEmpty);
    expect(err.any((e) => e.contains('timestamp') || e.contains('missing')), isTrue);
  });

  test('wrong type FAIL', () {
    final json = <String, dynamic>{
      'traceId': 123, 'signals': <String, dynamic>{}, 'state': <String, dynamic>{},
      'resolution': 'r', 'execution': <String, dynamic>{},
      'outcome': <String, dynamic>{'status': 's', 'effects': <dynamic>[]},
      'timestamp': 'ts',
    };
    expect(v.validateStructureFromMap(json), isNotEmpty);
  });

  test('validateAll valid trace and contract', () {
    final t = DecisionTraceDto(
      traceId: 't1',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );
    final r = v.validateAll(t, contractVersion: '1.0.0');
    expect(r.isValid, isTrue);
    expect(r.errors, isEmpty);
    expect(r.trace, t);
  });

  test('validateAll throwOnInvalid throws', () {
    final t = DecisionTraceDto(
      traceId: 't1',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: 'ts',
    );
    expect(
      () => v.validateAll(t, contractVersion: '2.0.0', throwOnInvalid: true),
      throwsA(isA<TraceValidationException>()),
    );
  });
}
