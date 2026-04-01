// H3 - Cascade: GCP scope compatibilityRules -> indirect on pluginGovernance, ciEnforcement.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_engine.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_type.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('GCP scope compatibilityRules has indirect impact on pluginGovernance and ciEnforcement', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-002'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.compatibilityRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    final report = GovernanceImpactEngine.analyze(gcp);
    final indirect = report.impacts
        .where((i) => i.type == GovernanceImpactType.indirect)
        .map((i) => i.affectedScope)
        .toSet();
    expect(indirect.contains(GCPScope.pluginGovernancePolicy), isTrue);
    expect(indirect.contains(GCPScope.ciEnforcementRules), isTrue);
  });
}
