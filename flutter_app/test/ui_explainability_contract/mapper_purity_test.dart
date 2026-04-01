import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';
import 'package:iris_flutter_app/bridge/dto/explanation_dto.dart';
import 'package:iris_flutter_app/bridge/dto/outcome_dto.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_mapper.dart';
import 'package:iris_flutter_app/ui/explainability_contract/explainability_view_model.dart';

DecisionTraceDto tr() => DecisionTraceDto(
      traceId: 't1',
      signals: <String, dynamic>{},
      state: <String, dynamic>{'k': 'v'},
      resolution: 'res',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>['e1']),
      timestamp: '2025-01-01T00:00:00Z',
    );

ExplanationDto ex() => const ExplanationDto(
      title: 'Title',
      summary: 'Sum',
      details: 'Det',
      safetyLevel: 'neutral',
      traceId: 't1',
    );

void main() {
  test('mapping 1-to-1 same input same output', () {
    final a = mapTraceToExplainability(tr(), ex());
    final b = mapTraceToExplainability(tr(), ex());
    expect(a, b);
    expect(a.traceId, 't1');
    expect(a.resolution, 'res');
    expect(a.outcomeStatus, 'ok');
    expect(a.outcomeEffects, <String>['e1']);
    expect(a.explanationTitle, 'Title');
    expect(a.safetyLevel, 'neutral');
  });

  test('traceId mismatch throws', () {
    final wrong = const ExplanationDto(
      title: 'T',
      summary: 'S',
      details: 'D',
      safetyLevel: 'n',
      traceId: 'other',
    );
    expect(() => mapTraceToExplainability(tr(), wrong), throwsArgumentError);
  });
}
