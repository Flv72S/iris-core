// H10 - Charter version model: immutability, equality.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/charter/governance_charter_version.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('GovernanceCharterVersion equality and hashCode', () {
    const v = GovernanceVersion(major: 1, minor: 0, patch: 0);
    final a = GovernanceCharterVersion(
      governanceVersion: v,
      charterHash: 'abc',
      declaredAt: DateTime.utc(2025, 12, 1),
    );
    final b = GovernanceCharterVersion(
      governanceVersion: v,
      charterHash: 'abc',
      declaredAt: DateTime.utc(2025, 12, 1),
    );
    final c = GovernanceCharterVersion(
      governanceVersion: v,
      charterHash: 'xyz',
      declaredAt: DateTime.utc(2025, 12, 1),
    );
    expect(a, b);
    expect(a.hashCode, b.hashCode);
    expect(a, isNot(c));
  });
}
