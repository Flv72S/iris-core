import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_context.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_rules.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_validator.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

GovernanceSnapshot _snapshot() {
  const v = GovernanceVersion(major: 2, minor: 0, patch: 0);
  final at = DateTime.utc(2026, 2, 1, 10, 0, 0);
  final impact = GovernanceImpactReport(gcpId: const GCPId('G'), fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0), toVersion: v, impacts: const []);
  final dec = GovernanceDecision(gcpId: const GCPId('G'), status: GovernanceDecisionStatus.approved, votes: const [], impactReport: impact, decidedAt: at);
  final rat = GovernanceRatificationRecord(decision: dec, previousVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0), newVersion: v, ratifiedAt: at);
  final act = GovernanceActivationSnapshot(activeVersion: v, activatedAt: at, source: rat);
  return GovernanceSnapshotBuilder.build(activation: act, gcpRegistry: GCPRegistry(), decisionRegistry: GovernanceDecisionRegistry([dec]), activePolicies: const {});
}

void main() {
  test('checkSnapshotImmutability passes', () {
    final ctx = GuardContext(contextId: 'v1', snapshot: _snapshot());
    expect(BuiltInValidators.checkSnapshotImmutability(ctx).passed, true);
  });
  test('checkNoDartIo fails when dart:io in sourceFiles', () {
    final ctx = GuardContext(contextId: 'v2', snapshot: _snapshot(), sourceFiles: ['dart:io']);
    expect(BuiltInValidators.checkNoDartIo(ctx).passed, false);
  });
  test('runValidation empty when pass', () {
    final reg = GuardValidatorRegistry();
    reg.register(StandardGuardRules.snapshotImmutability.id, BuiltInValidators.checkSnapshotImmutability);
    final violations = runValidation(GuardContext(contextId: 'r', snapshot: _snapshot()), GuardRuleSet(), reg);
    expect(violations.isEmpty, true);
  });
}
