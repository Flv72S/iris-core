// H5 - Successful activation: APPROVED, newVersion > current.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('APPROVED ratification -> snapshot created, registry updated', () {
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-2025-001'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-2025-001'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2025, 6, 1),
    );
    final ratification = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      ratifiedAt: DateTime.utc(2025, 6, 1),
    );
    final registry = GovernanceRegistry();
    final snapshot = GovernanceActivationEngine.activate(
      ratification: ratification,
      registry: registry,
    );
    expect(snapshot.activeVersion, GovernanceVersion(major: 1, minor: 1, patch: 0));
    expect(registry.current(), snapshot);
    expect(registry.getActiveGovernanceVersion(), snapshot.activeVersion);
    expect(registry.history().length, 1);
  });
}
