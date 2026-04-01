import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_checker.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_entry.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_matrix.dart';
import 'package:iris_flutter_app/governance/compatibility/compatibility_scope.dart';
import 'package:iris_flutter_app/governance/compatibility/version_range.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

void main() {
  late CompatibilityChecker checker;

  setUp(() {
    final entries = [
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
      ),
      CompatibilityEntry(
        scope: CompatibilityScope.coreToFlow,
        source: VersionRange(minVersion: Version(major: 2, minor: 0, patch: 0), maxVersion: Version(major: 2, minor: 0, patch: 0)),
        target: VersionRange(minVersion: Version(major: 2, minor: 0, patch: 0), maxVersion: Version(major: 2, minor: 999, patch: 999)),
      ),
      CompatibilityEntry(
        scope: CompatibilityScope.flowToPlugin,
        source: VersionRange(minVersion: Version(major: 1, minor: 1, patch: 0), maxVersion: Version(major: 1, minor: 999, patch: 999)),
        target: VersionRange(minVersion: Version(major: 1, minor: 0, patch: 0), maxVersion: Version(major: 1, minor: 99, patch: 99)),
      ),
    ];
    checker = CompatibilityChecker(CompatibilityMatrix(entries));
  });

  test('Core 1.0.0 + Flow 1.2.0 compatible', () {
    expect(
      checker.isCompatible(
        sourceVersion: Version(major: 1, minor: 0, patch: 0),
        targetVersion: Version(major: 1, minor: 2, patch: 0),
        scope: CompatibilityScope.coreToFlow,
      ),
      true,
    );
  });

  test('Core 1.0.0 + Flow 2.0.0 not compatible', () {
    expect(
      checker.isCompatible(
        sourceVersion: Version(major: 1, minor: 0, patch: 0),
        targetVersion: Version(major: 2, minor: 0, patch: 0),
        scope: CompatibilityScope.coreToFlow,
      ),
      false,
    );
  });

  test('Flow 1.2.3 + Plugin 1.0.0 compatible', () {
    expect(
      checker.isCompatible(
        sourceVersion: Version(major: 1, minor: 2, patch: 3),
        targetVersion: Version(major: 1, minor: 0, patch: 0),
        scope: CompatibilityScope.flowToPlugin,
      ),
      true,
    );
  });

  test('Flow 2.0.0 + Plugin 1.0.0 not compatible', () {
    expect(
      checker.isCompatible(
        sourceVersion: Version(major: 2, minor: 0, patch: 0),
        targetVersion: Version(major: 1, minor: 0, patch: 0),
        scope: CompatibilityScope.flowToPlugin,
      ),
      false,
    );
  });

  test('determinism 100 same checks', () {
    final results = <bool>[];
    for (var i = 0; i < 100; i++) {
      results.add(checker.isCompatible(
        sourceVersion: Version(major: 1, minor: 0, patch: 0),
        targetVersion: Version(major: 1, minor: 2, patch: 0),
        scope: CompatibilityScope.coreToFlow,
      ));
    }
    expect(results.every((r) => r == true), true);
  });
}
