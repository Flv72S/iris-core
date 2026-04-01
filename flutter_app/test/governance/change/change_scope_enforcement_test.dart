// G3 - Scope enforcement: allowed and forbidden combinations.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/change/change_classifier.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';

void main() {
  test('CORE + nonBreaking throws', () {
    final d = ChangeDescriptor(
      type: ChangeType.nonBreaking,
      scope: ChangeScope.core,
      description: 'fix',
      affectedComponents: ['x'],
    );
    expect(() => ChangeClassifier.validateChange(d), throwsA(isA<ChangeClassificationException>()));
  });

  test('CORE + coreBreak passes', () {
    final d = ChangeDescriptor(
      type: ChangeType.coreBreak,
      scope: ChangeScope.core,
      description: 'Core evolution',
      affectedComponents: ['core'],
    );
    expect(() => ChangeClassifier.validateChange(d), returnsNormally);
  });

  test('FLOW + backwardCompatible passes', () {
    final d = ChangeDescriptor(
      type: ChangeType.backwardCompatible,
      scope: ChangeScope.flow,
      description: 'New optional step',
      affectedComponents: ['flow'],
    );
    expect(() => ChangeClassifier.validateChange(d), returnsNormally);
  });

  test('PLUGIN + coreBreak throws', () {
    final d = ChangeDescriptor(
      type: ChangeType.coreBreak,
      scope: ChangeScope.plugin,
      description: 'n/a',
      affectedComponents: ['plugin'],
    );
    expect(() => ChangeClassifier.validateChange(d), throwsA(isA<ChangeClassificationException>()));
  });
}
