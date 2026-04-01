// Phase H: same GCP + ratification -> identical snapshots.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  test('same ratification produces equal snapshots and same hashCode', () {
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-2025-D'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-2025-D'),
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
    final reg1 = GovernanceRegistry();
    final reg2 = GovernanceRegistry();
    final s1 = GovernanceActivationEngine.activate(
      ratification: ratification,
      registry: reg1,
    );
    final s2 = GovernanceActivationEngine.activate(
      ratification: ratification,
      registry: reg2,
    );
    expect(s1, s2);
    expect(s1.hashCode, s2.hashCode);
    expect(s1.activeVersion, s2.activeVersion);
  });
}
