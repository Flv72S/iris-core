// H5 - Downgrade block.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_exception.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('activation with newVersion <= current -> GovernanceDowngradeAttemptException', () {
    final impact12 = GovernanceImpactReport(
      gcpId: const GCPId('GCP-2025-003'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 2, patch: 0),
      impacts: const [],
    );
    final decision12 = GovernanceDecision(
      gcpId: const GCPId('GCP-2025-003'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact12,
      decidedAt: DateTime.utc(2025, 5, 1),
    );
    final ratification12 = GovernanceRatificationRecord(
      decision: decision12,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 2, patch: 0),
      ratifiedAt: DateTime.utc(2025, 5, 1),
    );
    final ratification11 = GovernanceRatificationRecord(
      decision: decision12,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      ratifiedAt: DateTime.utc(2025, 6, 1),
    );
    final registry = GovernanceRegistry();
    GovernanceActivationEngine.activate(
      ratification: ratification12,
      registry: registry,
    );
    expect(registry.current()?.activeVersion, GovernanceVersion(major: 1, minor: 2, patch: 0));
    expect(
      () => GovernanceActivationEngine.activate(
        ratification: ratification11,
        registry: registry,
      ),
      throwsA(isA<GovernanceDowngradeAttemptException>()),
    );
    expect(registry.current()?.activeVersion, GovernanceVersion(major: 1, minor: 2, patch: 0));
  });
}
