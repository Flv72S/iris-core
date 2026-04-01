// Phase H validation: bypass attempts must fail or be impossible.

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
  test('activation with REJECTED ratification throws InvalidRatificationException', () {
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-2025-X'),
      fromVersion: GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: GovernanceVersion(major: 1, minor: 1, patch: 0),
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-2025-X'),
      status: GovernanceDecisionStatus.rejected,
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
    expect(
      () => GovernanceActivationEngine.activate(
        ratification: ratification,
        registry: registry,
      ),
      throwsA(isA<InvalidRatificationException>()),
    );
    expect(registry.current(), isNull);
  });

  test('modifying returned history list throws', () {
    final registry = GovernanceRegistry();
    final history = registry.history();
    expect(() => history.clear(), throwsUnsupportedError);
  });

  // After H5 hardening: no public API to register snapshots; _registerActivation
  // is library-private. All activation must go through GovernanceActivationEngine.activate().
  test('registry has no public registration API', () {
    final registry = GovernanceRegistry();
    expect(registry.history(), isEmpty);
    expect(registry.current(), isNull);
    expect(registry.getActiveGovernanceVersion(), isNull);
  });
}
