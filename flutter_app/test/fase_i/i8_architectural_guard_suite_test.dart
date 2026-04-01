// FASE I — I8 Architectural Guard Suite integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/architectural_guard.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_context.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_logger.dart';
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
  final impact = GovernanceImpactReport(
    gcpId: const GCPId('GCP-I8'),
    fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    toVersion: v,
    impacts: const [],
  );
  final dec = GovernanceDecision(
    gcpId: const GCPId('GCP-I8'),
    status: GovernanceDecisionStatus.approved,
    votes: const [],
    impactReport: impact,
    decidedAt: at,
  );
  final rat = GovernanceRatificationRecord(
    decision: dec,
    previousVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    newVersion: v,
    ratifiedAt: at,
  );
  final act = GovernanceActivationSnapshot(
    activeVersion: v,
    activatedAt: at,
    source: rat,
  );
  return GovernanceSnapshotBuilder.build(
    activation: act,
    gcpRegistry: GCPRegistry(),
    decisionRegistry: GovernanceDecisionRegistry([dec]),
    activePolicies: const {},
  );
}

void main() {
  group('I8 — Architectural Guard Suite', () {
    test('runGuardSuite returns GuardReport', () {
      final context = GuardContext(contextId: 'fi8', snapshot: _snapshot());
      final report = runGuardSuite(
        context,
        GuardRuleSet(),
        createDefaultRegistry(),
      );
      expect(report, isA<GuardReport>());
      expect(report.record, isA<GuardRunRecord>());
    });
    test('no violation when context passes all rules', () {
      final context = GuardContext(contextId: 'fi8-ok', snapshot: _snapshot());
      final report = runGuardSuite(
        context,
        GuardRuleSet(),
        createDefaultRegistry(),
      );
      expect(report.passed, isTrue);
      expect(report.violations.isEmpty, isTrue);
    });
    test('violation detected when sourceFiles contain dart:io', () {
      final context = GuardContext(
        contextId: 'fi8-fail',
        snapshot: _snapshot(),
        sourceFiles: ['dart:io'],
      );
      final report = runGuardSuite(
        context,
        GuardRuleSet(),
        createDefaultRegistry(),
      );
      expect(report.passed, isFalse);
      expect(report.violations.isNotEmpty, isTrue);
    });
    test('runHash deterministic for same context', () {
      final context = GuardContext(contextId: 'fi8-hash', snapshot: _snapshot());
      final r1 = runGuardSuite(context, GuardRuleSet(), createDefaultRegistry());
      final r2 = runGuardSuite(context, GuardRuleSet(), createDefaultRegistry());
      expect(r1.runHash, r2.runHash);
    });
    test('report serialized for CI/CD', () {
      final context = GuardContext(contextId: 'fi8-json', snapshot: _snapshot());
      final report = runGuardSuite(
        context,
        GuardRuleSet(),
        createDefaultRegistry(),
      );
      final json = report.record.toJson();
      expect(json['runId'], isNotEmpty);
      expect(json['runHash'], isNotEmpty);
      expect(json['passed'], isTrue);
    });
  });
}
