import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/bridge/mappers/dto_mappers.dart';

void main() {
  group('Mapper validation', () {
    test('mapOutcome throws on missing key', () {
      expect(
        () => mapOutcome(<String, dynamic>{'status': 'ok'}),
        throwsArgumentError,
      );
      expect(
        () => mapOutcome(<String, dynamic>{'effects': <dynamic>[]}),
        throwsArgumentError,
      );
    });

    test('mapOutcome throws on wrong type', () {
      expect(
        () => mapOutcome(<String, dynamic>{
          'status': 123,
          'effects': <dynamic>[],
        }),
        throwsArgumentError,
      );
      expect(
        () => mapOutcome(<String, dynamic>{
          'status': 'ok',
          'effects': 'not-a-list',
        }),
        throwsArgumentError,
      );
    });

    test('mapMode throws on missing key', () {
      expect(
        () => mapMode(<String, dynamic>{'modeId': 'm1'}),
        throwsArgumentError,
      );
    });

    test('mapExplanation throws on missing key', () {
      expect(
        () => mapExplanation(<String, dynamic>{
          'title': 'T',
          'summary': 'S',
          'details': 'D',
          'safetyLevel': 'n',
        }),
        throwsArgumentError,
      );
    });

    test('mapDecisionTrace throws on missing key', () {
      expect(
        () => mapDecisionTrace(<String, dynamic>{
          'traceId': 't1',
          'signals': <String, dynamic>{},
          'state': <String, dynamic>{},
          'resolution': 'r',
          'execution': <String, dynamic>{},
          'outcome': <String, dynamic>{'status': 's', 'effects': <dynamic>[]},
        }),
        throwsArgumentError,
      );
    });

    test('no silent default: valid payload maps as-is', () {
      final dto = mapOutcome(<String, dynamic>{
        'status': 'ok',
        'effects': <dynamic>['e1'],
      });
      expect(dto.status, 'ok');
      expect(dto.effects, <dynamic>['e1']);
    });
  });
}
