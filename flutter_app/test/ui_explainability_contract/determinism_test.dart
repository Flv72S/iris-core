import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/explanation_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_mapper.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';

void main() {
  test('same trace same ViewModel', () {
    final trace = DecisionTraceDto(
      traceId: 'x',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'r',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 's', effects: <dynamic>[]),
      timestamp: 'ts',
    );
    const explanation = ExplanationDto(
      title: 'T',
      summary: 'S',
      details: 'D',
      safetyLevel: 'n',
      traceId: 'x',
    );
    final vm1 = mapTraceToExplainability(trace, explanation);
    final vm2 = mapTraceToExplainability(trace, explanation);
    expect(vm1, vm2);
  });

  test('no DateTime.now in contract', () {
    final dir = Directory('lib/ui/explainability_contract');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('DateTime.now()'), isFalse);
      }
    }
  });

  test('no Random in contract', () {
    final dir = Directory('lib/ui/explainability_contract');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(f.readAsStringSync().contains('Random()'), isFalse);
      }
    }
  });
}
