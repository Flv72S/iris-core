// H1 - Compatibility: declared PASS; undeclared FAIL.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_compatibility.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('same version is compatible', () {
    final c = GovernanceCompatibility([]);
    const v = GovernanceVersion(major: 1, minor: 0, patch: 0);
    expect(c.isCompatible(v, v), isTrue);
  });

  test('declared pair is compatible', () {
    const v1 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v2 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final c = GovernanceCompatibility([
      GovernanceVersionPair(v1, v2),
    ]);
    expect(c.isCompatible(v1, v2), isTrue);
    expect(c.isCompatible(v2, v1), isTrue);
  });

  test('undeclared pair is not compatible', () {
    const v1 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v2 = GovernanceVersion(major: 2, minor: 0, patch: 0);
    final c = GovernanceCompatibility([]);
    expect(c.isCompatible(v1, v2), isFalse);
  });
}
