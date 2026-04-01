// H5 - Snapshot and history immutability; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('history returns unmodifiable list', () {
    final registry = GovernanceRegistry();
    final history = registry.history();
    expect(() => history.clear(), throwsUnsupportedError);
  });

  test('same ratification produces same snapshot', () {
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-2025-004'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-2025-004'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 6, 1, 12, 0),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      ratifiedAt: DateTime.utc(2025, 6, 1, 12, 0),
    );
    final registry1 = GovernanceRegistry();
    final registry2 = GovernanceRegistry();
    final snapshot1 = GovernanceActivationEngine.activate(
      ratification: ratification,
      registry: registry1,
    );
    final snapshot2 = GovernanceActivationEngine.activate(
      ratification: ratification,
      registry: registry2,
    );
    expect(snapshot1.activeVersion, snapshot2.activeVersion);
    expect(snapshot1.activatedAt, snapshot2.activatedAt);
    expect(snapshot1.source, snapshot2.source);
    expect(snapshot1, snapshot2);
    expect(snapshot1.hashCode, snapshot2.hashCode);
  });
}
