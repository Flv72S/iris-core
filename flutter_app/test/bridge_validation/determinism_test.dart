import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/bridge/validation/trace_validator.dart';
import 'package:iris_flutter_app/bridge/validation/validated_trace_result.dart';

void main() {
  DecisionTraceDto sampleTrace() => DecisionTraceDto(
        traceId: 'id',
        signals: <String, dynamic>{},
        state: <String, dynamic>{},
        resolution: 'r',
        execution: <String, dynamic>{},
        outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
        timestamp: 'ts',
      );

  group('Determinism', () {
    test('same input same result', () {
      final validator = TraceValidator();
      final trace = sampleTrace();
      final r1 = validator.validateAll(trace, contractVersion: '1.0.0');
      final r2 = validator.validateAll(trace, contractVersion: '1.0.0');
      expect(r1.isValid, r2.isValid);
      expect(r1.errors, r2.errors);
      expect(r1.trace, r2.trace);
    });

    test('ValidatedTraceResult equality deterministic', () {
      final t = sampleTrace();
      final r1 = ValidatedTraceResult(trace: t, isValid: true, errors: <String>[]);
      final r2 = ValidatedTraceResult(trace: t, isValid: true, errors: <String>[]);
      expect(r1, r2);
      expect(r1.hashCode, r2.hashCode);
    });

    test('validation source no DateTime.now', () {
      final dir = Directory('lib/bridge/validation');
      for (final f in dir.listSync()) {
        if (f is File && f.path.endsWith('.dart')) {
          expect(f.readAsStringSync().contains('DateTime.now()'), isFalse);
        }
      }
    });
    test('validation source no Random', () {
      final dir = Directory('lib/bridge/validation');
      for (final f in dir.listSync()) {
        if (f is File && f.path.endsWith('.dart')) {
          expect(f.readAsStringSync().contains('Random()'), isFalse);
        }
      }
    });
  });
}
