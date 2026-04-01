// I8 - Tests for guard context.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_context.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_logger.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

GovernanceSnapshot buildTestSnapshot() {
  const version = GovernanceVersion(major: 2, minor: 0, patch: 0);
  final capturedAt = DateTime.utc(2026, 2, 1, 10, 0, 0);
  final impactReport = GovernanceImpactReport(
    gcpId: const GCPId('GCP-GUARD'),
    fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    toVersion: version,
    impacts: const [],
  );
  final decision = GovernanceDecision(
    gcpId: const GCPId('GCP-GUARD'),
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
  final activation = GovernanceActivationSnapshot(
    activeVersion: version,
    activatedAt: capturedAt,
    source: ratificationRecord,
  );
  return GovernanceSnapshotBuilder.build(
    activation: activation,
    gcpRegistry: GCPRegistry(),
    decisionRegistry: GovernanceDecisionRegistry([decision]),
    activePolicies: const {},
  );
}

void main() {
  const testMediaRef = MediaReference(
    hash: 'sha256:guard-ctx',
    sizeBytes: 1024,
    mimeType: 'video/mp4',
    mediaPolicyId: 'POLICY_V1',
    location: PhysicalLocation.localDevice,
  );

  const testTierBinding = UserTierBinding(
    tier: UserTier.pro,
    mediaPolicyId: 'POLICY_V1',
  );

  const testDecision = MediaEnforcementDecision(
    uploadAllowed: true,
    localOnly: false,
    cloudAllowed: true,
    compressionRequired: false,
    coldArchiveAllowed: false,
    multiDeviceSyncAllowed: true,
    maxFileSizeBytes: 100000000,
  );

  late MediaLifecyclePlan testPlan;

  setUp(() {
    testPlan = MediaLifecyclePlan(
      initial: MediaLifecycleState.captured,
      transitions: [
        const MediaLifecycleTransition(
          from: MediaLifecycleState.captured,
          to: MediaLifecycleState.localOnly,
          event: MediaLifecycleEvent.captureCompleted,
        ),
      ],
    );
  });

  group('GuardContext', () {
    test('is immutable', () {
      final snapshot = buildTestSnapshot();
      final context = GuardContext(
        contextId: 'ctx-1',
        snapshot: snapshot,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
      );
      expect(context.contextId, 'ctx-1');
      expect(context.hasMediaContext, isTrue);
      expect(context.hasLifecyclePlan, isFalse);
    });

    test('hasLifecyclePlan when plan set', () {
      final snapshot = buildTestSnapshot();
      final context = GuardContext(
        contextId: 'ctx-2',
        snapshot: snapshot,
        lifecyclePlan: testPlan,
      );
      expect(context.hasLifecyclePlan, isTrue);
      expect(context.hasMediaContext, isFalse);
    });

    test('equality', () {
      final snapshot = buildTestSnapshot();
      final c1 = GuardContext(contextId: 'eq', snapshot: snapshot);
      final c2 = GuardContext(contextId: 'eq', snapshot: snapshot);
      expect(c1, equals(c2));
    });

    test('toJson', () {
      final snapshot = buildTestSnapshot();
      final context = GuardContext(
        contextId: 'json',
        snapshot: snapshot,
        sourceFiles: ['a.dart', 'b.dart'],
      );
      final json = context.toJson();
      expect(json['contextId'], 'json');
      expect(json['sourceFileCount'], 2);
    });
  });

  group('GuardContextBuilder', () {
    test('builds context with all optional fields', () {
      final snapshot = buildTestSnapshot();
      final context = GuardContextBuilder(contextId: 'build', snapshot: snapshot)
          .withMediaRef(testMediaRef)
          .withTierBinding(testTierBinding)
          .withDecision(testDecision)
          .withLifecyclePlan(testPlan)
          .withSourceFiles(['x.dart'])
          .withMetadata({'k': 'v'})
          .build();
      expect(context.hasMediaContext, isTrue);
      expect(context.hasLifecyclePlan, isTrue);
      expect(context.sourceFiles.length, 1);
      expect(context.metadata['k'], 'v');
    });

    test('withObservabilityLog', () {
      final snapshot = buildTestSnapshot();
      final log = ObservabilityLog.empty();
      final context = GuardContextBuilder(contextId: 'obs', snapshot: snapshot)
          .withObservabilityLog(log)
          .build();
      expect(context.hasObservabilityLog, isTrue);
    });
  });
}
