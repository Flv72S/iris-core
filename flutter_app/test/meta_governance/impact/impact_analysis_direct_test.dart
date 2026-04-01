// H3 - Direct impact: GCP scope versioningRules -> direct impact present.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_engine.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_type.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('GCP scope versioningRules has direct impact on versioningRules', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-001'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    final report = GovernanceImpactEngine.analyze(gcp);
    final direct = report.impacts
        .where((i) => i.type == GovernanceImpactType.direct)
        .toList();
    expect(direct.length, 1);
    expect(direct.first.affectedScope, GCPScope.versioningRules);
  });
}
