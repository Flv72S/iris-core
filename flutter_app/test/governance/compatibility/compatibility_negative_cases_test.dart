// G2 - Negative cases: no entry -> incompatible; undeclared -> incompatible.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_checker.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_entry.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_matrix.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_scope.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('absence of matching entry -> incompatible', () {
    final entries = [
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
      ),
      CompatibilityEntry(
        scope: CompatibilityScope.flowToPlugin,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
      ),
    ];
    final checker = CompatibilityChecker(CompatibilityMatrix(entries));
    expect(
      checker.isCompatible(
        sourceVersion: Version(major: 3, minor: 0, patch: 0),
        targetVersion: Version(major: 1, minor: 0, patch: 0),
        scope: CompatibilityScope.coreToFlow,
      ),
      false,
    );
  });

  test('Flow version outside plugin declared range -> incompatible', () {
    final entries = [
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
      ),
      CompatibilityEntry(
        scope: CompatibilityScope.flowToPlugin,
        source: VersionRange(minVersion: Version(major: 1, minor: 1, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
      ),
    ];
    final checker = CompatibilityChecker(CompatibilityMatrix(entries));
    expect(
      checker.isCompatible(
        sourceVersion: Version(major: 1, minor: 0, patch: 0),
        targetVersion: Version(major: 1, minor: 0, patch: 0),
        scope: CompatibilityScope.flowToPlugin,
      ),
      false,
    );
  });
}
