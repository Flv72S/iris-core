// H6 - Same input -> same snapshot (== and hashCode).

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
  test('same activation and registries produce equal snapshot and same hashCode', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-DET'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-DET'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 9, 1, 12, 0),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 9, 1, 12, 0),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 9, 1, 12, 0),
      source: ratification,
    );
    final gcpRegistry = GCPRegistry();
    final decisionRegistry = GovernanceDecisionRegistry([decision]);
    const policies = <String, String>{'p': 'v'};

    final a = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: gcpRegistry,
      decisionRegistry: decisionRegistry,
      activePolicies: policies,
    );
    final b = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: gcpRegistry,
      decisionRegistry: decisionRegistry,
      activePolicies: policies,
    );
    expect(a, b);
    expect(a.hashCode, b.hashCode);
  });
}
