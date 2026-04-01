// I8 - Tests for architectural guard entry point.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/architectural_guard.dart';
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

GovernanceSnapshot buildSnapshot() {
  const version = GovernanceVersion(major: 2, minor: 0, patch: 0);
  final at = DateTime.utc(2026, 2, 1, 10, 0, 0);
  final impact = GovernanceImpactReport(
    gcpId: const GCPId('GCP-AG'),
    fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    toVersion: version,
    impacts: const [],
  );
  final dec = GovernanceDecision(
    gcpId: const GCPId('GCP-AG'),
    status: GovernanceDecisionStatus.approved,
    votes: const [],
    impactReport: impact,
    decidedAt: at,
  );
  final rat = GovernanceRatificationRecord(
    decision: dec,
    previousVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    newVersion: version,
    ratifiedAt: at,
  );
  final act = GovernanceActivationSnapshot(
    activeVersion: version,
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
  group('GuardReport', () {
    test('passed when no violations', () {
      final snapshot = buildSnapshot();
      final context = GuardContext(contextId: 'ag1', snapshot: snapshot);
      final ruleSet = GuardRuleSet();
      final registry = createDefaultRegistry();
      final report = runGuardSuite(context, ruleSet, registry);
      expect(report.passed, isTrue);
      expect(report.violations.isEmpty, isTrue);
      expect(report.runHash, isNotEmpty);
    });

    test('failed when violation detected', () {
      final snapshot = buildSnapshot();
      final context = GuardContext(
        contextId: 'ag2',
        snapshot: snapshot,
        sourceFiles: ['dart:io'],
      );
      final ruleSet = GuardRuleSet();
      final registry = createDefaultRegistry();
      final report = runGuardSuite(context, ruleSet, registry);
      expect(report.passed, isFalse);
      expect(report.violations.length, greaterThanOrEqualTo(1));
    });

    test('toJson includes record and context', () {
      final snapshot = buildSnapshot();
      final context = GuardContext(contextId: 'ag3', snapshot: snapshot);
      final report = runGuardSuite(
        context,
        GuardRuleSet(),
        createDefaultRegistry(),
      );
      final json = report.toJson();
      expect(json['record'], isA<Map>());
      expect(json['contextSummary'], isA<Map>());
    });

    test('deterministic: same context produces same runHash', () {
      final snapshot = buildSnapshot();
      final context = GuardContext(contextId: 'ag4', snapshot: snapshot);
      final ruleSet = GuardRuleSet();
      final registry = createDefaultRegistry();
      final report1 = runGuardSuite(context, ruleSet, registry);
      final report2 = runGuardSuite(context, ruleSet, registry);
      expect(report1.runHash, report2.runHash);
    });
  });

  group('createDefaultRegistry', () {
    test('registers built-in validators', () {
      final registry = createDefaultRegistry();
      expect(registry.registeredRuleIds, contains('GUARD-001'));
      expect(registry.registeredRuleIds, contains('GUARD-005'));
      expect(registry.registeredRuleIds, contains('GUARD-010'));
    });
  });

  group('runGuardSuite', () {
    test('does not alter context', () {
      final snapshot = buildSnapshot();
      final context = GuardContext(contextId: 'ag5', snapshot: snapshot);
      final beforeVersion = context.snapshot.version.toString();
      runGuardSuite(context, GuardRuleSet(), createDefaultRegistry());
      expect(context.snapshot.version.toString(), beforeVersion);
    });
  });
}
