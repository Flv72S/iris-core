// H6 - Snapshot creation from activation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_scope.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_registry.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('snapshot created from activation and registries', () {
    const v100 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-H6-001'),
      fromVersion: v100,
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-H6-001'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 7, 1, 10, 0),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: v100,
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 7, 1, 10, 0),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 7, 1, 10, 0),
      source: ratification,
    );
    final gcpRegistry = GCPRegistry();
    gcpRegistry.register(GCPDescriptor(
      id: const GCPId('GCP-H6-001'),
      title: 'H6',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: v100,
      toVersion: v110,
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'L',
      rollbackStrategy: 'R',
    ));
    final decisionRegistry = GovernanceDecisionRegistry();
    decisionRegistry.register(decision);
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: gcpRegistry,
      decisionRegistry: decisionRegistry,
      activePolicies: {'policy.a': 'v1'},
    );
    expect(snapshot.version, v110);
    expect(snapshot.capturedAt, DateTime.utc(2025, 7, 1, 10, 0));
    expect(snapshot.source, ratification);
    expect(snapshot.activeProposals.length, 1);
    expect(snapshot.activeDecisions.length, 1);
    expect(snapshot.activePolicies['policy.a'], 'v1');
  });

  test('snapshot registered and retrievable by version', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-H6-002'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-H6-002'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 7, 2),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 7, 2),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 7, 2),
      source: ratification,
    );
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );
    final registry = GovernanceSnapshotRegistry();
    registry.register(snapshot);
    expect(registry.getByVersion(v110), snapshot);
    expect(registry.latest(), snapshot);
  });

  test('registering same version twice throws', () {
    const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-DUP'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-DUP'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 7, 3),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v,
      ratifiedAt: DateTime.utc(2025, 7, 3),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v,
      activatedAt: DateTime.utc(2025, 7, 3),
      source: ratification,
    );
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );
    final registry = GovernanceSnapshotRegistry();
    registry.register(snapshot);
    expect(
      () => registry.register(snapshot),
      throwsA(isA<GovernanceSnapshotRegistryException>()),
    );
  });
}
