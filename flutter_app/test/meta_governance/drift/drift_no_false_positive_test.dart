// H7 - No false positive when state matches snapshot.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/drift/governance_drift_engine.dart';
import 'package:iris_flutter_app/meta_governance/drift/governance_drift_type.dart';
import 'package:iris_flutter_app/meta_governance/drift/governance_state_extractor.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_registry.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('no drift reported when policies and structure match snapshot', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-NFP'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-NFP'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 9, 1),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 9, 1),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 9, 1),
      source: ratification,
    );
    final policies = <String, String>{'a': '1', 'b': '2'};
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: policies,
    );
    final snapshotRegistry = GovernanceSnapshotRegistry();
    snapshotRegistry.register(snapshot);

    final currentState = GovernanceStructuralState(
      currentVersion: v110,
      activeProposals: snapshot.activeProposals,
      activeDecisions: snapshot.activeDecisions,
      activePolicies: Map<String, String>.from(policies),
    );

    final report = GovernanceDriftEngine.analyze(
      currentState: currentState,
      snapshotRegistry: snapshotRegistry,
      analyzedAt: DateTime.utc(2025, 9, 2),
    );

    expect(report.drifts.length, 0);
    expect(report.drifts.where((d) => d.type == GovernanceDriftType.policyMismatch), isEmpty);
    expect(report.drifts.where((d) => d.type == GovernanceDriftType.structuralInconsistency), isEmpty);
  });
}
