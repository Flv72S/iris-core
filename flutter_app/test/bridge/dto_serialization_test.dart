import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/mappers/dto_mappers.dart';

void main() {
  group('DTO serialization round-trip', () {
    test('OutcomeDto round-trip', () {
      final json = <String, dynamic>{'status': 'ok', 'effects': <dynamic>['a', 'b']};
      final dto = mapOutcome(json);
      final back = dto.toJson();
      expect(back['status'], json['status']);
      expect(back['effects'], json['effects']);
    });
    test('ModeDto round-trip', () {
      final json = <String, dynamic>{'modeId': 'm1', 'label': 'Label'};
      final dto = mapMode(json);
      final back = dto.toJson();
      expect(back['modeId'], json['modeId']);
      expect(back['label'], json['label']);
    });
    test('ExplanationDto round-trip', () {
      final json = <String, dynamic>{
        'title': 'T', 'summary': 'S', 'details': 'D',
        'safetyLevel': 'neutral', 'traceId': 'tr1',
      };
      final dto = mapExplanation(json);
      final back = dto.toJson();
      expect(back['title'], json['title']);
      expect(back['traceId'], json['traceId']);
    });
    test('DecisionTraceDto round-trip', () {
      final json = <String, dynamic>{
        'traceId': 't1',
        'signals': <String, dynamic>{'s1': 1},
        'state': <String, dynamic>{'k': 'v'},
        'resolution': 'res',
        'execution': <String, dynamic>{},
        'outcome': <String, dynamic>{'status': 'done', 'effects': <dynamic>[]},
        'timestamp': '2025-01-01T00:00:00Z',
      };
      final dto = mapDecisionTrace(json);
      final back = dto.toJson();
      expect(back['traceId'], json['traceId']);
      expect(back['outcome']['status'], json['outcome']['status']);
    });
  });
}
