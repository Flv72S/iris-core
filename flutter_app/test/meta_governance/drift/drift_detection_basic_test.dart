// H7 - No drift when state is coherent with snapshot.

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
  test('state coherent with snapshot -> drifts empty', () {
    const v110 = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-B'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: v110,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-B'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 8, 1),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: v110,
      ratifiedAt: DateTime.utc(2025, 8, 1),
    );
    final act = GovernanceActivationSnapshot(
      activeVersion: v110,
      activatedAt: DateTime.utc(2025, 8, 1),
      source: rat,
    );
    final policies = <String, String>{'p': 'v1'};
    final snap = GovernanceSnapshotBuilder.build(
      activation: act,
      gcpRegistry: GCPRegistry(),
      decisionRegistry: GovernanceDecisionRegistry([decision]),
      activePolicies: policies,
    );
    final reg = GovernanceSnapshotRegistry();
    reg.register(snap);
    final state = GovernanceStructuralState(
      currentVersion: v110,
      activeProposals: snap.activeProposals,
      activeDecisions: snap.activeDecisions,
      activePolicies: policies,
    );
    final report = GovernanceDriftEngine.analyze(
      currentState: state,
      snapshotRegistry: reg,
      analyzedAt: DateTime.utc(2025, 8, 2),
    );
    expect(report.currentVersion, v110);
    expect(report.drifts, isEmpty);
  });
}
