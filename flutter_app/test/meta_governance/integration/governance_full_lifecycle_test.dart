import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_engine.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_rules.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_vote.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_engine.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('E2E: GCP 1.0.0->1.1.0, impact, approve, activate -> getActiveGovernanceVersion 1.1.0', () {
    const v100 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-001'),
      title: 'Bump',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: v100,
      toVersion: v110,
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'L',
      rollbackStrategy: 'R',
    );
    final impact = GovernanceImpactEngine.analyze(gcp);
    final rules = GovernanceDecisionRules(
      requiredApprovals: 1,
      requiredRejectionsToBlock: 1,
      requireImpactReport: true,
    );
    final votes = [
      GovernanceVote(
        authorityId: const GovernanceAuthorityId('r1'),
        vote: GovernanceVoteType.approve,
        timestamp: DateTime.utc(2025, 6, 1, 12, 0),
      ),
    ];
    final ratification = GovernanceDecisionEngine.evaluate(
      gcp: gcp,
      impact: impact,
      votes: votes,
      currentVersion: v100,
      rules: rules,
    );
    expect(ratification.decision.status, GovernanceDecisionStatus.approved);
    final registry = GovernanceRegistry();
    final snapshot = GovernanceActivationEngine.activate(
      ratification: ratification,
      registry: registry,
    );
    expect(registry.getActiveGovernanceVersion(), v110);
    expect(registry.history().length, 1);
    expect(snapshot.activeVersion, v110);
  });
}
