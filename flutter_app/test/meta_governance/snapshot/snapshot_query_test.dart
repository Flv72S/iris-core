// H6 - Temporal query by version and time range.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_query.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_registry.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('findByVersion returns snapshot for version', () {
    final registry = GovernanceSnapshotRegistry();
    final impact1 = GovernanceImpactReport(
      gcpId: const GCPId('GCP-Q1'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decision1 = GovernanceDecision(
      gcpId: const GCPId('GCP-Q1'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact1,
      decidedAt: DateTime.utc(2025, 6, 1),
    );
    final rat1 = GovernanceRatificationRecord(
      decision: decision1,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      ratifiedAt: DateTime.utc(2025, 6, 1),
    );
    final act1 = GovernanceActivationSnapshot(
      activeVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      activatedAt: DateTime.utc(2025, 6, 1),
      source: rat1,
    );
    final s1 = GovernanceSnapshotBuilder.build(
      activation: act1,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision1]),
      activePolicies: const {},
    );
    registry.register(s1);
    final query = GovernanceSnapshotQuery(registry);
    expect(query.findByVersion(GovernanceVersion(major: 1, minor: 1, patch: 0)), s1);
    expect(query.findByVersion(GovernanceVersion(major: 1, minor: 3, patch: 0)), isNull);
  });

  test('findByTimeRange returns snapshots in range', () {
    final registry = GovernanceSnapshotRegistry();
    final mk = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-Q2'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: mk,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-Q2'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 7, 15),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: mk,
      ratifiedAt: DateTime.utc(2025, 7, 15),
    );
    final act = GovernanceActivationSnapshot(
      activeVersion: mk,
      activatedAt: DateTime.utc(2025, 7, 15),
      source: rat,
    );
    final snap = GovernanceSnapshotBuilder.build(
      activation: act,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );
    registry.register(snap);
    final query = GovernanceSnapshotQuery(registry);
    final inJuly = query.findByTimeRange(
      DateTime.utc(2025, 7, 1),
      DateTime.utc(2025, 7, 31),
    );
    expect(inJuly.length, 1);
    expect(inJuly.first.version, mk);
  });
}
