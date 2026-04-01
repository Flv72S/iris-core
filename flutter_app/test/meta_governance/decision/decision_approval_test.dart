// H4 - Approval path: quorum reached, APPROVED, version = gcp.toVersion.

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
  final impact = GovernanceImpactReport(
    gcpId: gcp.id,
    fromVersion: gcp.fromVersion,
    toVersion: gcp.toVersion,
    impacts: const [],
  );
  final rules = GovernanceDecisionRules(
    requiredApprovals: 1,
    requiredRejectionsToBlock: 1,
    requireImpactReport: true,
  );
  final currentVersion = GovernanceVersion(major: 1, minor: 0, patch: 0);
  final decidedAt = DateTime.utc(2025, 6, 1, 12, 0);

  test('quorum reached -> decision APPROVED', () {
    final votes = [
      GovernanceVote(
        authorityId: const GovernanceAuthorityId('r1'),
        vote: GovernanceVoteType.approve,
        timestamp: decidedAt,
      ),
    ];
    final record = GovernanceDecisionEngine.evaluate(
      gcp: gcp,
      impact: impact,
      votes: votes,
      currentVersion: currentVersion,
      rules: rules,
    );
    expect(record.decision.status, GovernanceDecisionStatus.approved);
  });

  test('newVersion is gcp.toVersion when APPROVED', () {
    final votes = [
      GovernanceVote(
        authorityId: const GovernanceAuthorityId('r1'),
        vote: GovernanceVoteType.approve,
        timestamp: decidedAt,
      ),
    ];
    final record = GovernanceDecisionEngine.evaluate(
      gcp: gcp,
      impact: impact,
      votes: votes,
      currentVersion: currentVersion,
      rules: rules,
    );
    expect(record.newVersion, gcp.toVersion);
    expect(record.previousVersion, currentVersion);
  });
}
