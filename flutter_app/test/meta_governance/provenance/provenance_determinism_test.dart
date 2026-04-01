// H8 - Same inputs -> same chain (== and hashCode).

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
import 'package:iris_flutter_app/meta_governance/provenance/governance_provenance_builder.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('same artifacts -> same chain equality and hashCode', () {
    const v100 = GovernanceVersion(major: 1, minor: 0, patch: 0);
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final gcp = GCPDescriptor(
      id: const GCPId('GCP-DET'),
      title: 'Det',
      proposerRole: MetaGovernanceRole.governanceMaintainer,
      fromVersion: v100,
      toVersion: v110,
      scope: GCPScope.versioningRules,
      rationale: 'R',
      riskAssessment: 'L',
      rollbackStrategy: 'R',
    );
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-DET'),
      fromVersion: v100,
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-DET'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 11, 15, 12, 0),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: v100,
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 11, 15, 12, 0),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 11, 15, 12, 0),
      source: ratification,
    );
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: const {},
    );
    final chain1 = GovernanceProvenanceBuilder.build(
      version: v110,
      gcp: gcp,
      impact: impact,
      decision: decision,
      ratification: ratification,
      activation: activation,
      snapshot: snapshot,
    );
    final chain2 = GovernanceProvenanceBuilder.build(
      version: v110,
      gcp: gcp,
      impact: impact,
      decision: decision,
      ratification: ratification,
      activation: activation,
      snapshot: snapshot,
    );
    expect(chain1, chain2);
    expect(chain1.hashCode, chain2.hashCode);
  });
}
