// H4 - Pending; missing impact fails.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_engine.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_rules.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_vote.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('approvals below quorum -> PENDING', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-003'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.ciEnforcementRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    final impact = GovernanceImpactReport(
      gcpId: gcp.id,
      fromVersion: gcp.fromVersion,
      toVersion: gcp.toVersion,
      impacts: const [],
    );
    final rules = GovernanceDecisionRules(
      requiredApprovals: 2,
      requiredRejectionsToBlock: 2,
      requireImpactReport: true,
    );
    const currentVersion = GovernanceVersion(major: 1, minor: 0, patch: 0);
    final votes = [
      GovernanceVote(
        authorityId: const GovernanceAuthorityId('r1'),
        vote: GovernanceVoteType.approve,
        timestamp: DateTime.utc(2025, 6, 1),
      ),
    ];
    final record = GovernanceDecisionEngine.evaluate(
      gcp: gcp,
      impact: impact,
      votes: votes,
      currentVersion: currentVersion,
      rules: rules,
    );
    expect(record.decision.status, GovernanceDecisionStatus.pending);
    expect(record.newVersion, currentVersion);
  });

  test('requireImpactReport true and impact null throws', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-004'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'Risk',
      rollbackStrategy: 'Rollback',
    );
    final rules = GovernanceDecisionRules(
      requiredApprovals: 1,
      requiredRejectionsToBlock: 1,
      requireImpactReport: true,
    );
    expect(
      () => GovernanceDecisionEngine.evaluate(
        gcp: gcp,
        impact: null,
        votes: [],
        currentVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
        rules: rules,
      ),
      throwsA(isA<GovernanceDecisionEngineException>()),
    );
  });
}
