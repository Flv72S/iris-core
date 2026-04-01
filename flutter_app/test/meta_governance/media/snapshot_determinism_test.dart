// G7 Completion — Stessi binding ordine diverso → snapshot uguale.

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
  test('same bindings different order produce equal snapshot and same hashCode', () {
    const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-DET'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-DET'),
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
    final activation = GovernanceActivationSnapshot(
      activeVersion: v,
      activatedAt: DateTime.utc(2026, 1, 1),
      source: rat,
    );
    final reg = GCPRegistry();
    final dr = GovernanceDecisionRegistry([decision]);

    final bindingsOrder1 = [
      UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
      UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
      UserTierBinding(tier: UserTier.enterprise, mediaPolicyId: 'MEDIA_ENT_V1'),
    ];
    final bindingsOrder2 = [
      UserTierBinding(tier: UserTier.enterprise, mediaPolicyId: 'MEDIA_ENT_V1'),
      UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
      UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
    ];

    final s1 = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: reg,
      decisionRegistry: dr,
      activePolicies: const {},
      activeTierBindings: bindingsOrder1,
    );
    final s2 = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: reg,
      decisionRegistry: dr,
      activePolicies: const {},
      activeTierBindings: bindingsOrder2,
    );

    expect(s1, s2);
    expect(s1.hashCode, s2.hashCode);
    expect(s1.activeTierBindings.length, 3);
    expect(s1.activeTierBindings[0].tier, UserTier.free);
    expect(s1.activeTierBindings[1].tier, UserTier.pro);
    expect(s1.activeTierBindings[2].tier, UserTier.enterprise);
  });
}
