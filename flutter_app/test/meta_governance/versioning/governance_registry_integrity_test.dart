// H1 - Registry: no duplicates; currentVersion valid; range min>max FAIL; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version_range.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version_registry.dart';

void main() {
  test('duplicate version throws', () {
    const v = GovernanceVersion(major: 1, minor: 0, patch: 0);
    expect(
      () => GovernanceVersionRegistry(
        versions: [v, v],
        currentVersion: v,
      ),
      throwsA(isA<GovernanceVersionRegistryException>()),
    );
  });

  test('currentVersion not in list throws', () {
    const v1 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v2 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    expect(
      () => GovernanceVersionRegistry(
        versions: [v1],
        currentVersion: v2,
      ),
      throwsA(isA<GovernanceVersionRegistryException>()),
    );
  });

  test('currentVersion and listAllVersions and isKnownVersion', () {
    const v1 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v2 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final reg = GovernanceVersionRegistry(versions: [v1, v2], currentVersion: v2);
    expect(reg.currentVersion, v2);
    expect(reg.listAllVersions().length, 2);
    expect(reg.isKnownVersion(v1), isTrue);
    expect(reg.isKnownVersion(GovernanceVersion(major: 2, minor: 0, patch: 0)), isFalse);
  });

  test('range min > max throws', () {
    const min = GovernanceVersion(major: 2, minor: 0, patch: 0);
    const max = GovernanceVersion(major: 1, minor: 0, patch: 0);
    expect(
      () => GovernanceVersionRange(min: min, max: max),
      throwsA(isA<GovernanceVersionRangeException>()),
    );
  });

  test('range contains', () {
    final r = GovernanceVersionRange(
      min: GovernanceVersion(major: 1, minor: 0, patch: 0),
      max: GovernanceVersion(major: 1, minor: 1, patch: 0),
    );
    expect(r.contains(GovernanceVersion(major: 1, minor: 0, patch: 0)), isTrue);
    expect(r.contains(GovernanceVersion(major: 1, minor: 1, patch: 0)), isTrue);
    expect(r.contains(GovernanceVersion(major: 1, minor: 2, patch: 0)), isFalse);
  });

  test('determinism: 100 comparisons same result', () {
    const a = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const b = GovernanceVersion(major: 2, minor: 0, patch: 0);
    for (var i = 0; i < 100; i++) {
      expect(GovernanceVersion.compare(a, b), lessThan(0));
      expect(GovernanceVersion.compare(b, a), greaterThan(0));
    }
  });
}
