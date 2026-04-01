// G5 - Registry: duplicate identifier fails; lookup by scope.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_descriptor.dart';
import 'package:iris_flutter_app/governance/deprecation/deprecation_registry.dart';
import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('duplicate identifier throws', () {
    final list = [
      DeprecationDescriptor(
        identifier: 'dup',
        scope: ChangeScope.flow,
        startVersion: Version(major: 1, minor: 0, patch: 0),
        sunsetVersion: Version(major: 2, minor: 0, patch: 0),
        rationale: 'r1',
      ),
      DeprecationDescriptor(
        identifier: 'dup',
        scope: ChangeScope.plugin,
        startVersion: Version(major: 1, minor: 0, patch: 0),
        sunsetVersion: Version(major: 2, minor: 0, patch: 0),
        rationale: 'r2',
      ),
    ];
    expect(() => DeprecationRegistry(list), throwsA(isA<DeprecationRegistryException>()));
  });

  test('getByIdentifier and listByScope', () {
    final a = DeprecationDescriptor(
      identifier: 'a',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'r',
    );
    final b = DeprecationDescriptor(
      identifier: 'b',
      scope: ChangeScope.flow,
      startVersion: Version(major: 1, minor: 0, patch: 0),
      sunsetVersion: Version(major: 2, minor: 0, patch: 0),
      rationale: 'r',
    );
    final reg = DeprecationRegistry([a, b]);
    expect(reg.getByIdentifier('a'), a);
    expect(reg.getByIdentifier('c'), isNull);
    expect(reg.listByScope(ChangeScope.flow).length, 2);
    expect(reg.listByScope(ChangeScope.plugin).length, 0);
  });
}
