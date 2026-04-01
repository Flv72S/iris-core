// G7 — GCP flow: activate then snapshot with mediaPolicyId and tier binding.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('activate then build snapshot with media ids and tier bindings', () {
    const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-M'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-M'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2026, 2, 1),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v,
      ratifiedAt: DateTime.utc(2026, 2, 1),
    );
    final registry = GovernanceRegistry();
    final act = GovernanceActivationEngine.activate(ratification: rat, registry: registry);
    expect(act.activeVersion, v);

    const ids = ['MEDIA_FREE_V1', 'MEDIA_PRO_V1'];
    final bindings = [
      UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
      UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
    ];
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: act,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
      activeMediaPolicyIds: ids,
      activeTierBindings: bindings,
    );

    expect(snapshot.version, v);
    expect(snapshot.activeMediaPolicyIds, ids);
    expect(snapshot.activeTierBindings.length, 2);
    expect(snapshot.activeTierBindings.any((b) => b.mediaPolicyId == 'MEDIA_FREE_V1'), true);
    expect(snapshot.activeTierBindings.any((b) => b.mediaPolicyId == 'MEDIA_PRO_V1'), true);
  });
}
