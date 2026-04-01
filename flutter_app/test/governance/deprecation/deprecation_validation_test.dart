// G5 - Descriptor validation: start >= sunset fail, empty identifier/rationale fail.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_descriptor.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_validator.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('startVersion >= sunsetVersion throws', () {
    final d = DeprecationDescriptor(
      identifier: 'x',
      scope: ChangeScope.flow,
      startVersion: Version(major: 2, minor: 0, patch: 0),
      sunsetVersion: Version(major: 1, minor: 5, patch: 0),
      rationale: 'reason',
    );
    expect(() => DeprecationValidator.validateDeprecation(d), throwsA(isA<DeprecationValidationException>()));
  });

  test('empty identifier throws', () {
    final d = DeprecationDescriptor(
      identifier: '   ',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'reason',
    );
    expect(() => DeprecationValidator.validateDeprecation(d), throwsA(isA<DeprecationValidationException>()));
  });

  test('empty rationale throws', () {
    final d = DeprecationDescriptor(
      identifier: 'x',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: '   ',
    );
    expect(() => DeprecationValidator.validateDeprecation(d), throwsA(isA<DeprecationValidationException>()));
  });

  test('valid descriptor passes', () {
    final d = DeprecationDescriptor(
      identifier: 'step-old',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 2, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'Replaced by step-new',
    );
    DeprecationValidator.validateDeprecation(d);
  });
}
