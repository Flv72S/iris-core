// G5 - CORE sunset minor increment fails; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_descriptor.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_enforcer.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_registry.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_validator.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('CORE deprecation with sunsetVersion minor increment throws', () {
    final d = DeprecationDescriptor(
      identifier: 'core-old',
      scope: ChangeScope.core,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 1, minor: 1, patch: 0),
      rationale: 'Core change',
    );
    expect(() => DeprecationValidator.validateDeprecation(d), throwsA(isA<DeprecationValidationException>()));
  });

  test('CORE deprecation with sunset 2.0.0 passes', () {
    final d = DeprecationDescriptor(
      identifier: 'core-old',
      scope: ChangeScope.core,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'Core change',
    );
    DeprecationValidator.validateDeprecation(d);
  });

  test('determinism 100 runs same input', () {
    final d = DeprecationDescriptor(
      identifier: 'x',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'r',
    );
    final reg = DeprecationRegistry([d]);
    for (var i = 0; i < 100; i++) {
      DeprecationEnforcer.enforceSunset(currentVersion: Version(major: 1, minor: 5, patch: 0), registry: reg);
    }
  });
}
