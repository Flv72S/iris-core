// H3 - No phantom impact; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_dependency_map.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_engine.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('every impact scope is either GCP scope or in dependency map', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-003'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.deprecationPolicy,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    final report = GovernanceImpactEngine.analyze(gcp);
    final allowed = {gcp.scope, ...GovernanceDependencyMap.dependenciesOf(gcp.scope)};
    for (final dep in GovernanceDependencyMap.dependenciesOf(gcp.scope)) {
      allowed.addAll(GovernanceDependencyMap.dependenciesOf(dep));
    }
    for (final impact in report.impacts) {
      expect(allowed.contains(impact.affectedScope), isTrue);
    }
  });

  test('determinism: 100 analyses same report equality', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-004'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.breakingEnforcementRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    final first = GovernanceImpactEngine.analyze(gcp);
    for (var i = 0; i < 99; i++) {
      final next = GovernanceImpactEngine.analyze(gcp);
      expect(next, first);
      expect(next.hashCode, first.hashCode);
    }
  });
}
