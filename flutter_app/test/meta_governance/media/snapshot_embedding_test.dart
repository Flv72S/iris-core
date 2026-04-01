// G7 - Snapshot activeMediaPolicyIds deterministic.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('snapshot with activeMediaPolicyIds: equal and same hashCode', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-M'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-M'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2026, 1, 1),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2026, 1, 1),
    );
    final act = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2026, 1, 1),
      source: rat,
    );
    const ids = ['MEDIA_FREE_V1', 'MEDIA_PRO_V1'];
    final s1 = GovernanceSnapshotBuilder.build(
      activation: act,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
      activeMediaPolicyIds: ids,
    );
    final s2 = GovernanceSnapshotBuilder.build(
      activation: act,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
      activeMediaPolicyIds: ids,
    );
    expect(s1.activeMediaPolicyIds, ids);
    expect(s1, s2);
    expect(s1.hashCode, s2.hashCode);
  });

  test('snapshot without activeMediaPolicyIds defaults to empty', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-X'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-X'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2026, 1, 2),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2026, 1, 2),
    );
    final act = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2026, 1, 2),
      source: rat,
    );
    final s = GovernanceSnapshotBuilder.build(
      activation: act,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );
    expect(s.activeMediaPolicyIds, isEmpty);
    expect(s.activeTierBindings, isEmpty);
  });
}
