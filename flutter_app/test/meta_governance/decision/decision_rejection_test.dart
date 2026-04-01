// H4 - Rejection path.

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
  test('rejections >= requiredRejectionsToBlock -> REJECTED, newVersion unchanged', () {
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-2025-002'),
      title: 'T',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: const GovernanceVersion(major: 1, minor: 1, patch: 0),
      scope: GCPScope.deprecationPolicy,
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
      requiredRejectionsToBlock: 1,
      requireImpactReport: true,
    );
    const currentVersion = GovernanceVersion(major: 1, minor: 0, patch: 0);
    final votes = [
      GovernanceVote(
        authorityId: const GovernanceAuthorityId('r1'),
        vote: GovernanceVoteType.reject,
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
    expect(record.decision.status, GovernanceDecisionStatus.rejected);
    expect(record.newVersion, currentVersion);
  });
}
