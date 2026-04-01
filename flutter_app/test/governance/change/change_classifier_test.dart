// G3 - Descriptor validation; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/change/change_classifier.dart';
import 'package:iris_flutter_app/governance/change/change_descriptor.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';

void main() {
  test('empty description throws', () {
    final d = ChangeDescriptor(
      type: ChangeType.nonBreaking,
      scope: ChangeScope.flow,
      description: '   ',
      affectedComponents: ['a'],
    );
    expect(() => ChangeClassifier.validateChange(d), throwsA(isA<ChangeClassificationException>()));
  });

  test('empty affectedComponents throws', () {
    final d = ChangeDescriptor(
      type: ChangeType.nonBreaking,
      scope: ChangeScope.flow,
      description: 'fix',
      affectedComponents: [],
    );
    expect(() => ChangeClassifier.validateChange(d), throwsA(isA<ChangeClassificationException>()));
  });

  test('valid descriptor passes', () {
    final d = ChangeDescriptor(
      type: ChangeType.hardBreak,
      scope: ChangeScope.flow,
      description: 'Remove step X',
      affectedComponents: ['stepGraph'],
    );
    expect(() => ChangeClassifier.validateChange(d), returnsNormally);
  });

  test('same descriptor validated 100 times yields identical result', () {
    final d = ChangeDescriptor(
      type: ChangeType.backwardCompatible,
      scope: ChangeScope.plugin,
      description: 'New hook',
      affectedComponents: ['plugin'],
    );
    for (var i = 0; i < 100; i++) {
      ChangeClassifier.validateChange(d);
    }
  });
}
