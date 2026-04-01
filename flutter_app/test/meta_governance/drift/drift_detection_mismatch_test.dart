// H7 - Policy mismatch, missing snapshot.

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
  test('policy mismatch detected when active policies differ from snapshot', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-PM'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-PM'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 8, 5),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 8, 5),
    );
    final activation = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 8, 5),
      source: ratification,
    );
    final snapshot = GovernanceSnapshotBuilder.build(
      activation: activation,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: {'policy.a': 'v1'},
    );
    final snapshotRegistry = GovernanceSnapshotRegistry();
    snapshotRegistry.register(snapshot);

    final currentState = GovernanceStructuralState(
      currentVersion: v110,
      activeProposals: snapshot.activeProposals,
      activeDecisions: snapshot.activeDecisions,
      activePolicies: {'policy.a': 'v2'},
    );

    final report = GovernanceDriftEngine.analyze(
      currentState: currentState,
      snapshotRegistry: snapshotRegistry,
      analyzedAt: DateTime.utc(2025, 8, 6),
    );

    expect(report.drifts.any((d) => d.type == GovernanceDriftType.policyMismatch), isTrue);
  });

  test('missing snapshot detected when no snapshot for current version', () {
    const v120 = GovernanceVersion(major: 1, minor: 2, patch: 0);
    final snapshotRegistry = GovernanceSnapshotRegistry();

    final currentState = GovernanceStructuralState(
      currentVersion: v120,
      activeProposals: const [],
      activeDecisions: const [],
      activePolicies: const {},
    );

    final report = GovernanceDriftEngine.analyze(
      currentState: currentState,
      snapshotRegistry: snapshotRegistry,
      analyzedAt: DateTime.utc(2025, 8, 7),
    );

    expect(report.drifts.any((d) => d.type == GovernanceDriftType.missingSnapshot), isTrue);
    expect(report.currentVersion, v120);
  });
}
