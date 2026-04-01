// H2 - Registry: duplicate GCPId FAIL; lookup correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  GCPDescriptor gcp(String id) {
    return GCPDescriptor(
      id: GCPId(id),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.deprecationPolicy,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
  }

  test('duplicate GCPId in constructor throws', () {
    expect(() => GCPRegistry([gcp('GCP-2025-001'), gcp('GCP-2025-001')]),
        throwsA(isA<GCPRegistryException>()));
  });

  test('register duplicate throws', () {
    final reg = GCPRegistry([gcp('GCP-2025-001')]);
    expect(() => reg.register(gcp('GCP-2025-001')), throwsA(isA<GCPRegistryException>()));
  });

  test('getById and listAll', () {
    final a = gcp('GCP-2025-001');
    final b = gcp('GCP-2025-002');
    final reg = GCPRegistry([a, b]);
    expect(reg.getById(GCPId('GCP-2025-001')), a);
    expect(reg.getById(GCPId('GCP-2025-003')), isNull);
    expect(reg.listAll().length, 2);
  });
}
