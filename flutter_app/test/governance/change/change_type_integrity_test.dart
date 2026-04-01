// G3 - Enum integrity: ChangeType and ChangeScope closed.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/change/change_type.dart';

void main() {
  test('ChangeType is closed with exactly 5 values', () {
    expect(ChangeType.values.length, 5);
    expect(ChangeType.values, contains(ChangeType.nonBreaking));
    expect(ChangeType.values, contains(ChangeType.backwardCompatible));
    expect(ChangeType.values, contains(ChangeType.softBreak));
    expect(ChangeType.values, contains(ChangeType.hardBreak));
    expect(ChangeType.values, contains(ChangeType.coreBreak));
  });

  test('ChangeScope is closed with exactly 3 values', () {
    expect(ChangeScope.values.length, 3);
    expect(ChangeScope.values, contains(ChangeScope.core));
    expect(ChangeScope.values, contains(ChangeScope.flow));
    expect(ChangeScope.values, contains(ChangeScope.plugin));
  });
}
