// I7 - Tests for ObservabilityContext.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_context.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  const testMediaRef = MediaReference(
    hash: 'sha256:ctx123',
    sizeBytes: 2048,
    mimeType: 'image/png',
    mediaPolicyId: 'CTX_POLICY',
    location: PhysicalLocation.cloud,
  );

  const testTierBinding = UserTierBinding(
    tier: UserTier.enterprise,
    mediaPolicyId: 'CTX_POLICY',
  );

  const testDecision = MediaEnforcementDecision(
    uploadAllowed: true,
    localOnly: false,
    cloudAllowed: true,
    compressionRequired: false,
    coldArchiveAllowed: true,
    multiDeviceSyncAllowed: true,
    maxFileSizeBytes: 500000000,
  );

  late GovernanceActivationSnapshot activation;
  late GovernanceDecision decision;

  setUp(() {
    const version = GovernanceVersion(major: 2, minor: 0, patch: 0);
    final capturedAt = DateTime.utc(2026, 2, 1, 10, 0, 0);

    final impactReport = GovernanceImpactReport(
      gcpId: const GCPId('GCP-CTX'),
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: version,
      impacts: const [],
    );

    decision = GovernanceDecision(
      gcpId: const GCPId('GCP-CTX'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impactReport,
      decidedAt: capturedAt,
    );

    final ratificationRecord = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      newVersion: version,
      ratifiedAt: capturedAt,
    );

    activation = GovernanceActivationSnapshot(
      activeVersion: version,
      activatedAt: capturedAt,
      source: ratificationRecord,
    );
  });

  group('ObservabilityContext', () {
    test('is immutable', () {
      final snapshot = GovernanceSnapshotBuilder.build(
        activation: activation,
        gcpRegistry: GCPRegistry(),
        decisionRegistry: GovernanceDecisionRegistry([decision]),
        activePolicies: const {},
      );

      final context = ObservabilityContext(
        executionId: 'exec-001',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 0,
      );

      expect(context.executionId, 'exec-001');
      expect(context.mediaRef, testMediaRef);
      expect(context.tierBinding, testTierBinding);
      expect(context.decision, testDecision);
      expect(context.startStep, 0);
    });

    test('equality works correctly', () {
      final snapshot = GovernanceSnapshotBuilder.build(
        activation: activation,
        gcpRegistry: GCPRegistry(),
        decisionRegistry: GovernanceDecisionRegistry([decision]),
        activePolicies: const {},
      );

      final context1 = ObservabilityContext(
        executionId: 'exec-eq',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 5,
      );

      final context2 = ObservabilityContext(
        executionId: 'exec-eq',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 5,
      );

      expect(context1, equals(context2));
    });

    test('hashCode is deterministic', () {
      final snapshot = GovernanceSnapshotBuilder.build(
        activation: activation,
        gcpRegistry: GCPRegistry(),
        decisionRegistry: GovernanceDecisionRegistry([decision]),
        activePolicies: const {},
      );

      final context1 = ObservabilityContext(
        executionId: 'exec-hash',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 10,
      );

      final context2 = ObservabilityContext(
        executionId: 'exec-hash',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 10,
      );

      expect(context1.hashCode, context2.hashCode);
    });

    test('toJson serializes correctly', () {
      final snapshot = GovernanceSnapshotBuilder.build(
        activation: activation,
        gcpRegistry: GCPRegistry(),
        decisionRegistry: GovernanceDecisionRegistry([decision]),
        activePolicies: const {},
      );

      final context = ObservabilityContext(
        executionId: 'exec-json',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 3,
      );

      final json = context.toJson();

      expect(json['executionId'], 'exec-json');
      expect(json['startStep'], 3);
      expect(json['mediaRef'], isA<Map>());
      expect(json['tierBinding'], isA<Map>());
      expect(json['decision'], isA<Map>());
    });
  });

  group('ObservabilityContextBuilder', () {
    test('tracks step correctly', () {
      final snapshot = GovernanceSnapshotBuilder.build(
        activation: activation,
        gcpRegistry: GCPRegistry(),
        decisionRegistry: GovernanceDecisionRegistry([decision]),
        activePolicies: const {},
      );

      final builder = ObservabilityContextBuilder(
        executionId: 'exec-build',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
      );

      expect(builder.currentStep, 0);
      expect(builder.nextStep(), 1);
      expect(builder.nextStep(), 2);
      expect(builder.currentStep, 2);
    });

    test('builds immutable context', () {
      final snapshot = GovernanceSnapshotBuilder.build(
        activation: activation,
        gcpRegistry: GCPRegistry(),
        decisionRegistry: GovernanceDecisionRegistry([decision]),
        activePolicies: const {},
      );

      final builder = ObservabilityContextBuilder(
        executionId: 'exec-immut',
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        snapshot: snapshot,
        startStep: 5,
      );

      builder.nextStep();
      builder.nextStep();

      final context = builder.build();

      expect(context.executionId, 'exec-immut');
      expect(context.startStep, 7);
    });
  });
}
