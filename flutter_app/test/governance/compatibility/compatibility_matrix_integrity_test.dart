// G2 - Matrix integrity: no overlap, no ambiguous, each scope has at least one entry.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_entry.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_matrix.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_scope.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  test('each scope has at least one entry', () {
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
    final matrix = CompatibilityMatrix(entries);
    expect(matrix.entries.length, 2);
  });

  test('overlapping entries in same scope throw', () {
    final entries = [
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
      ),
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 500, patch: 0)),
      ),
    ];
    expect(() => CompatibilityMatrix(entries), throwsA(isA<CompatibilityMatrixException>()));
  });

  test('missing scope throws', () {
    final entries = [
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
      ),
    ];
    expect(() => CompatibilityMatrix(entries), throwsA(isA<CompatibilityMatrixException>()));
  });
}
