// H6 - Snapshot immutability: no modification possible.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  late GovernanceSnapshot snapshot;

  setUp(() {
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-IM'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-IM'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 8, 1),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      ratifiedAt: DateTime.utc(2025, 8, 1),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      activatedAt: DateTime.utc(2025, 8, 1),
      source: ratification,
    );
    snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: {'k': 'v'},
      activeMediaPolicyIds: ['MEDIA_FREE_V1'],
      activeTierBindings: [UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1')],
    );
  });

  test('activeProposals list is unmodifiable', () {
    expect(() => snapshot.activeProposals.clear(), throwsUnsupportedError);
  });

  test('activeDecisions list is unmodifiable', () {
    expect(() => snapshot.activeDecisions.clear(), throwsUnsupportedError);
  });

  test('activePolicies map is unmodifiable', () {
    expect(() => snapshot.activePolicies['x'] = 'y', throwsUnsupportedError);
    expect(() => snapshot.activePolicies.clear(), throwsUnsupportedError);
  });

  test('activeMediaPolicyIds list is unmodifiable', () {
    expect(() => snapshot.activeMediaPolicyIds.clear(), throwsUnsupportedError);
  });

  test('activeTierBindings list is unmodifiable', () {
    expect(() => snapshot.activeTierBindings.clear(), throwsUnsupportedError);
  });
}
