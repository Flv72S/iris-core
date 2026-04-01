// G7 Completion — Protezione downgrade invariata: dominio media non altera il blocco.

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
  test('activate v2 then attempt v1 -> GovernanceDowngradeAttemptException', () {
    final impactV2 = GovernanceImpactReport(
      gcpId: const GCPId('GCP-MEDIA-V2'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 2, patch: 0),
      impacts: const [],
    );
    final decisionV2 = GovernanceDecision(
      gcpId: const GCPId('GCP-MEDIA-V2'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impactV2,
      decidedAt: DateTime.utc(2026, 2, 1),
    );
    final ratV2 = GovernanceRatificationRecord(
      decision: decisionV2,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 2, patch: 0),
      ratifiedAt: DateTime.utc(2026, 2, 1),
    );

    final impactV1 = GovernanceImpactReport(
      gcpId: const GCPId('GCP-MEDIA-V1'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decisionV1 = GovernanceDecision(
      gcpId: const GCPId('GCP-MEDIA-V1'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impactV1,
      decidedAt: DateTime.utc(2026, 2, 2),
    );
    final ratV1 = GovernanceRatificationRecord(
      decision: decisionV1,
      previousVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      ratifiedAt: DateTime.utc(2026, 2, 2),
    );

    final registry = GovernanceRegistry();
    GovernanceActivationEngine.activate(ratification: ratV2, registry: registry);
    expect(registry.current()?.activeVersion, GovernanceVersion(major: 1, minor: 2, patch: 0));

    expect(
      () => GovernanceActivationEngine.activate(
        ratification: ratV1,
        registry: registry,
      ),
      throwsA(isA<GovernanceDowngradeAttemptException>()),
    );
    expect(registry.current()?.activeVersion, GovernanceVersion(major: 1, minor: 2, patch: 0));
  });
}
