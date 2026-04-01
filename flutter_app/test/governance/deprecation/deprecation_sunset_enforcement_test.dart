// G5 - Sunset: current >= sunset fail; current < sunset pass.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_descriptor.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_enforcer.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_registry.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('start 1.2.0 sunset 2.0.0: current 2.0.0 fails', () {
    final d = DeprecationDescriptor(
      identifier: 'old-api',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 2, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'removed',
    );
    final reg = DeprecationRegistry([d]);
    expect(
      () => DeprecationEnforcer.enforceSunset(currentVersion: Version(major: 2, minor: 0, patch: 0), registry: reg),
      throwsA(isA<DeprecationSunsetViolation>()),
    );
  });

  test('start 1.2.0 sunset 2.0.0: current 1.5.0 passes', () {
    final d = DeprecationDescriptor(
      identifier: 'old-api',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 2, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'removed',
    );
    final reg = DeprecationRegistry([d]);
    DeprecationEnforcer.enforceSunset(currentVersion: Version(major: 1, minor: 5, patch: 0), registry: reg);
  });
}
