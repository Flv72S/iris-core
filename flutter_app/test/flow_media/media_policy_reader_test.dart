// F-Media — MediaPolicyReader read-only snapshot access.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_policy_reader.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  late GovernanceSnapshot snapshot;

  setUp(() {
    const v = GovernanceVersion(major: 1, minor: 0, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-R'),
      fromVersion: v,
      toVersion: v,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-R'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2026, 1, 1),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: v,
      newVersion: v,
      ratifiedAt: DateTime.utc(2026, 1, 1),
    );
    snapshot = GovernanceSnapshot(
      version: v,
      capturedAt: DateTime.utc(2026, 1, 1),
      source: rat,
      activeProposals: const [],
      activeDecisions: [decision],
      activePolicies: const {},
      activeMediaPolicyIds: ['MEDIA_FREE_V1', 'MEDIA_PRO_V1'],
      activeTierBindings: [
        UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
        UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
      ],
    );
  });

  test('getActiveMediaPolicyIds returns snapshot list', () {
    final reader = MediaPolicyReader(snapshot);
    expect(reader.getActiveMediaPolicyIds(), ['MEDIA_FREE_V1', 'MEDIA_PRO_V1']);
  });

  test('bindingForTier returns correct binding', () {
    final reader = MediaPolicyReader(snapshot);
    final freeBinding = reader.bindingForTier(UserTier.free);
    expect(freeBinding?.mediaPolicyId, 'MEDIA_FREE_V1');
    final proBinding = reader.bindingForTier(UserTier.pro);
    expect(proBinding?.mediaPolicyId, 'MEDIA_PRO_V1');
  });

  test('bindingForTier returns null if not found', () {
    final reader = MediaPolicyReader(snapshot);
    final entBinding = reader.bindingForTier(UserTier.enterprise);
    expect(entBinding, isNull);
  });

  test('isPolicyActive returns true for active policy', () {
    final reader = MediaPolicyReader(snapshot);
    expect(reader.isPolicyActive('MEDIA_FREE_V1'), true);
    expect(reader.isPolicyActive('MEDIA_PRO_V1'), true);
  });

  test('isPolicyActive returns false for inactive policy', () {
    final reader = MediaPolicyReader(snapshot);
    expect(reader.isPolicyActive('MEDIA_ENTERPRISE_V1'), false);
  });
}
