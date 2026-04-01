import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';
import 'package:iris_flutter_app/core/domain/primitives/decision_primitive.dart';

void main() {
  group('DecisionPrimitive', () {
    test('createPayload has topic and options', () {
      final p = DecisionPrimitive.createPayload(
        topic: 'T',
        options: ['A', 'B'],
        atHeight: 1,
      );
      expect(p['payload']['topic'], 'T');
      expect(p['payload']['options'], ['A', 'B']);
    });
    test('resolvePayload has chosenOption and resolvedAtHeight', () {
      final p = DecisionPrimitive.resolvePayload(
        id: 'id1',
        chosenOption: 'A',
        version: 1,
        atHeight: 10,
      );
      expect(p['chosenOption'], 'A');
      expect(p['resolvedAtHeight'], 10);
    });
  });

  group('AgreementPrimitive', () {
    test('meetsThreshold true when count >= threshold', () {
      expect(AgreementPrimitive.meetsThreshold(3, 2), isTrue);
      expect(AgreementPrimitive.meetsThreshold(2, 2), isTrue);
    });
    test('meetsThreshold false when count < threshold', () {
      expect(AgreementPrimitive.meetsThreshold(1, 2), isFalse);
    });
    test('createPayload has participants and empty signatures', () {
      final p = AgreementPrimitive.createPayload(
        participants: ['a', 'b'],
        atHeight: 1,
      );
      expect(p['payload']['participants'], ['a', 'b']);
      expect(p['payload']['signatures'], isEmpty);
      expect(p['payload']['isFinalized'], isFalse);
    });
  });
}
