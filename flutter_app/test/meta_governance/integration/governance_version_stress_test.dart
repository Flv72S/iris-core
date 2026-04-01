// Phase H: version conflict stress - downgrade blocked, duplicate blocked.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_engine.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_exception.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

GovernanceRatificationRecord _approvedRecord(
  String id,
  GovernanceVersion fromV,
  GovernanceVersion toV,
) {
  final impact = GovernanceImpactReport(
    gcpId: GCPId(id),
    fromVersion: fromV,
    toVersion: toV,
    impacts: const [],
  );
  final decision = GovernanceDecision(
    gcpId: GCPId(id),
    status: GovernanceDecisionStatus.approved,
    votes: const [],
    impactReport: impact,
    decidedAt: DateTime.utc(2025, 6, 1),
  );
  return GovernanceRatificationRecord(
    decision: decision,
    previousVersion: fromV,
    newVersion: toV,
    ratifiedAt: DateTime.utc(2025, 6, 1),
  );
}

void main() {
  test('activate 1.1.0 then 1.2.0 then try 1.1.0 -> downgrade blocked', () {
    final registry = GovernanceRegistry();
    final r110 = _approvedRecord('GCP-1', GovernanceVersion(major: 1, minor: 0, patch: 0), GovernanceVersion(major: 1, minor: 1, patch: 0));
    final r120 = _approvedRecord('GCP-2', GovernanceVersion(major: 1, minor: 1, patch: 0), GovernanceVersion(major: 1, minor: 2, patch: 0));
    GovernanceActivationEngine.activate(ratification: r110, registry: registry);
    GovernanceActivationEngine.activate(ratification: r120, registry: registry);
    expect(registry.getActiveGovernanceVersion(), GovernanceVersion(major: 1, minor: 2, patch: 0));
    expect(
      () => GovernanceActivationEngine.activate(ratification: r110, registry: registry),
      throwsA(isA<GovernanceDowngradeAttemptException>()),
    );
    expect(registry.history().length, 2);
  });

  test('duplicate 1.2.0 activation blocked (same or lower version)', () {
    final registry = GovernanceRegistry();
    final r120 = _approvedRecord('GCP-A', GovernanceVersion(major: 1, minor: 1, patch: 0), GovernanceVersion(major: 1, minor: 2, patch: 0));
    GovernanceActivationEngine.activate(ratification: r120, registry: registry);
    expect(
      () => GovernanceActivationEngine.activate(ratification: r120, registry: registry),
      throwsA(isA<GovernanceDowngradeAttemptException>()),
    );
    expect(registry.history().length, 1);
  });
}
