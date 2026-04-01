// H2 - fromVersion >= toVersion FAIL; implementer proposer FAIL; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_validator.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('fromVersion >= toVersion throws', () {
    final g = GCPDescriptor(
      id: const GCPId('GCP-2025-001'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    expect(() => GCPValidator.validateGCP(g), throwsA(isA<GCPValidationException>()));
  });

  test('implementer as proposer throws', () {
    final g = GCPDescriptor(
      id: const GCPId('GCP-2025-001'),
      title: 'T',
      proposerRole: MetaGovernanceRole.implementer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    expect(() => GCPValidator.validateGCP(g), throwsA(isA<GCPValidationException>()));
  });

  test('determinism: 100 validations same result', () {
    final g = GCPDescriptor(
      id: const GCPId('GCP-2025-001'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.ciEnforcementRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    for (var i = 0; i < 100; i++) {
      GCPValidator.validateGCP(g);
    }
  });
}
