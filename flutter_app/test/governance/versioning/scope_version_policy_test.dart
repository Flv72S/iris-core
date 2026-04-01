// G1 - Scope policy: Core major-only; deterministic toString.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_scope_policy.dart';

void main() {
  group('Core policy', () {
    test('1.1.0 for Core is invalid', () {
      const v = Version(major: 1, minor: 1, patch: 0);
      expect(VersionScopePolicy.isValidVersionForScope(v, ScopeType.core), false);
    });

    test('2.0.0 for Core is valid', () {
      const v = Version(major: 2, minor: 0, patch: 0);
      expect(VersionScopePolicy.isValidVersionForScope(v, ScopeType.core), true);
    });

    test('2.0.1 for Core is invalid', () {
      const v = Version(major: 2, minor: 0, patch: 1);
      expect(VersionScopePolicy.isValidVersionForScope(v, ScopeType.core), false);
    });
  });

  group('Flow and Plugin accept full SemVer', () {
    test('1.2.3 for Flow is valid', () {
      const v = Version(major: 1, minor: 2, patch: 3);
      expect(VersionScopePolicy.isValidVersionForScope(v, ScopeType.flow), true);
    });

    test('1.0.0 for Plugin is valid', () {
      const v = Version(major: 1, minor: 0, patch: 0);
      expect(VersionScopePolicy.isValidVersionForScope(v, ScopeType.plugin), true);
    });
  });

  group('Deterministic toString', () {
    test('100 iterations produce identical output', () {
      const v = Version(major: 1, minor: 2, patch: 3, preRelease: 'beta');
      final results = <String>[];
      for (var i = 0; i < 100; i++) {
        results.add(v.toString());
      }
      final first = results.first;
      expect(results.every((s) => s == first), true);
      expect(first, '1.2.3-beta');
    });
  });
}
