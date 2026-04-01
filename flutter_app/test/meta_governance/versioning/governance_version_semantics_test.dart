// H1 - Version semantics: MAJOR > MINOR > PATCH; comparisons.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('MAJOR dominates MINOR and PATCH', () {
    final a = GovernanceVersion(major: 1, minor: 99, patch: 99);
    final b = GovernanceVersion(major: 2, minor: 0, patch: 0);
    expect(GovernanceVersion.compare(a, b), lessThan(0));
    expect(GovernanceVersion.isLessThan(a, b), isTrue);
    expect(GovernanceVersion.isGreaterThan(b, a), isTrue);
  });

  test('MINOR dominates PATCH', () {
    final a = GovernanceVersion(major: 1, minor: 0, patch: 99);
    final b = GovernanceVersion(major: 1, minor: 1, patch: 0);
    expect(GovernanceVersion.compare(a, b), lessThan(0));
  });

  test('equality and toString', () {
    const v = GovernanceVersion(major: 2, minor: 1, patch: 3);
    expect(v.toString(), '2.1.3');
    expect(v, GovernanceVersion(major: 2, minor: 1, patch: 3));
    expect(v.hashCode, GovernanceVersion(major: 2, minor: 1, patch: 3).hashCode);
  });

  test('same version compare 0', () {
    const v = GovernanceVersion(major: 1, minor: 0, patch: 0);
    expect(GovernanceVersion.compare(v, v), 0);
  });
}
