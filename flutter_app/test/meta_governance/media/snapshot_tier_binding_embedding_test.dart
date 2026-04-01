// G7 Completion — Snapshot TierBinding embedding: presenza, equality, hashCode.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  late GovernanceActivationSnapshot activation;
  late GovernanceDecision decision;

  setUp(() {
    const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-MEDIA'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v,
      impacts: const [],
    );
    decision = GovernanceDecision(
      gcpId: const GCPId('GCP-MEDIA'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2026, 1, 1),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v,
      ratifiedAt: DateTime.utc(2026, 1, 1),
    );
    activation = GovernanceActivationSnapshot(
      activeVersion: v,
      activatedAt: DateTime.utc(2026, 1, 1),
      source: rat,
    );
  });

  test('snapshot with activeTierBindings contains them', () {
    final bindings = [
      UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
      UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
    ];
    final s = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
      activeTierBindings: bindings,
    );
    expect(s.activeTierBindings.length, 2);
    expect(s.activeTierBindings[0].tier, UserTier.free);
    expect(s.activeTierBindings[0].mediaPolicyId, 'MEDIA_FREE_V1');
    expect(s.activeTierBindings[1].tier, UserTier.pro);
    expect(s.activeTierBindings[1].mediaPolicyId, 'MEDIA_PRO_V1');
  });

  test('snapshot with same tier bindings: equal and same hashCode', () {
    final bindings = [
      UserTierBinding(tier: UserTier.enterprise, mediaPolicyId: 'MEDIA_ENT_V1'),
    ];
    final s1 = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
      activeTierBindings: bindings,
    );
    final s2 = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
      activeTierBindings: bindings,
    );
    expect(s1, s2);
    expect(s1.hashCode, s2.hashCode);
  });

  test('snapshot without activeTierBindings defaults to empty', () {
    final s = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );
    expect(s.activeTierBindings, isEmpty);
  });
}
