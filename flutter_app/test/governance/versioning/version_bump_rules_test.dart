// G1 - Bump rules: Flow and Core semantics.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_bump_rules.dart';
import 'package:iris_flutter_app/governance/versioning/version_scope_policy.dart';

void main() {
  test('Flow 1.2.3 + hardBreak -> 2.0.0', () {
    const current = Version(major: 1, minor: 2, patch: 3);
    final next = VersionBumpRules.computeNextVersion(current, ChangeType.hardBreak, ScopeType.flow);
    expect(next.major, 2);
    expect(next.minor, 0);
    expect(next.patch, 0);
  });

  test('Flow 1.2.3 + backwardCompatible -> 1.3.0', () {
    const current = Version(major: 1, minor: 2, patch: 3);
    final next = VersionBumpRules.computeNextVersion(current, ChangeType.backwardCompatible, ScopeType.flow);
    expect(next.major, 1);
    expect(next.minor, 3);
    expect(next.patch, 0);
  });

  test('Flow 1.2.3 + nonBreaking -> 1.2.4', () {
    const current = Version(major: 1, minor: 2, patch: 3);
    final next = VersionBumpRules.computeNextVersion(current, ChangeType.nonBreaking, ScopeType.flow);
    expect(next.major, 1);
    expect(next.minor, 2);
    expect(next.patch, 4);
  });

  test('Core 3.0.0 + any change -> 4.0.0', () {
    const current = Version(major: 3, minor: 0, patch: 0);
    for (final changeType in ChangeType.values) {
      final next = VersionBumpRules.computeNextVersion(current, changeType, ScopeType.core);
      expect(next.major, 4);
      expect(next.minor, 0);
      expect(next.patch, 0);
    }
  });
}
