// H10 - Charter integrity: pass, tampering fails, determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/charter/governance_charter_validator.dart';
import 'package:iris_flutter_app/meta_governance/charter/governance_charter_version.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  const v100 = GovernanceVersion(major: 1, minor: 0, patch: 0);

  test('charter unchanged -> validateCharterIntegrity true', () {
    const content = '# Charter\n\nContent.';
    final hash = GovernanceCharterValidator.computeCharterHash(content);
    final declared = GovernanceCharterVersion(
      governanceVersion: v100,
      charterHash: hash,
      declaredAt: DateTime.utc(2025, 12, 1),
    );
    expect(
      GovernanceCharterValidator.validateCharterIntegrity(
        declaredVersion: declared,
        currentCharterContent: content,
      ),
      isTrue,
    );
  });

  test('charter tampered -> validateCharterIntegrity false', () {
    const content = '# Charter\n\nContent.';
    final hash = GovernanceCharterValidator.computeCharterHash(content);
    final declared = GovernanceCharterVersion(
      governanceVersion: v100,
      charterHash: hash,
      declaredAt: DateTime.utc(2025, 12, 1),
    );
    expect(
      GovernanceCharterValidator.validateCharterIntegrity(
        declaredVersion: declared,
        currentCharterContent: '# Charter\n\nContent tampered.',
      ),
      isFalse,
    );
  });

  test('version incoherent -> validateCharterIntegrity false', () {
    const content = '# Charter';
    final hash = GovernanceCharterValidator.computeCharterHash(content);
    final declared = GovernanceCharterVersion(
      governanceVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      charterHash: hash,
      declaredAt: DateTime.utc(2025, 12, 1),
    );
    expect(
      GovernanceCharterValidator.validateCharterIntegrity(
        declaredVersion: declared,
        currentCharterContent: content,
        expectedVersion: v100,
      ),
      isFalse,
    );
  });

  test('same content -> same hash (determinism)', () {
    const content = 'Same';
    final h1 = GovernanceCharterValidator.computeCharterHash(content);
    final h2 = GovernanceCharterValidator.computeCharterHash(content);
    expect(h1, h2);
  });
}
