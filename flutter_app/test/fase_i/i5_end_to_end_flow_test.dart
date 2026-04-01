// FASE I — I5 End-to-End flow integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_adapter.dart';
import 'package:iris_flutter_app/flow_media/media_policy_lookup.dart';
import 'package:iris_flutter_app/flow_media/media_policy_reader.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/media_execution/media_execution_orchestrator.dart';
import 'package:iris_flutter_app/media_execution/simulated_execution_adapter.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_engine.dart';
import 'package:iris_flutter_app/media_materialization/media_materialization_engine.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision_registry.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/media_storage_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/retention_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/storage_mode.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_registry.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot_builder.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

GovernanceSnapshot _createSnapshot() {
  const v = GovernanceVersion(major: 1, minor: 1, patch: 0);
  final at = DateTime.utc(2026, 1, 1, 12, 0, 0);
  final impact = GovernanceImpactReport(
    gcpId: const GCPId('GCP-FI5'),
    fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    toVersion: v,
    impacts: const [],
  );
  final decision = GovernanceDecision(
    gcpId: const GCPId('GCP-FI5'),
    status: GovernanceDecisionStatus.approved,
    votes: const [],
    impactReport: impact,
    decidedAt: at,
  );
  final rat = GovernanceRatificationRecord(
    decision: decision,
    previousVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
    newVersion: v,
    ratifiedAt: at,
  );
  final activation = GovernanceActivationSnapshot(
    activeVersion: v,
    activatedAt: at,
    source: rat,
  );
  const policy = MediaStoragePolicy(
    id: 'MEDIA_FI5',
    version: '1.0.0',
    storageMode: StorageMode.deviceOnly,
    maxFileSizeMB: 50,
    retentionPolicy: RetentionLocalOnly(),
    compressionRequired: true,
    multiDeviceSync: false,
    coldArchiveEnabled: false,
  );
  final lookup = InMemoryMediaPolicyLookup({policy.id: policy});
  return GovernanceSnapshotBuilder.build(
    activation: activation,
    gcpRegistry: GCPRegistry(),
    decisionRegistry: GovernanceDecisionRegistry([decision]),
    activePolicies: const {},
    activeMediaPolicyIds: [policy.id],
    activeTierBindings: const [
      UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FI5'),
    ],
  );
}

void main() {
  const lifecycleEngine = MediaLifecycleEngine();
  const materializationEngine = MediaMaterializationEngine();
  const orchestrator = MediaExecutionOrchestrator();

  group('I5 — End-to-End Flow', () {
    test('full flow: enforcement -> lifecycle -> materialization -> execution', () async {
      final snapshot = _createSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final policy = MediaStoragePolicy(
        id: 'MEDIA_FI5',
        version: '1.0.0',
        storageMode: StorageMode.deviceOnly,
        maxFileSizeMB: 50,
        retentionPolicy: RetentionLocalOnly(),
        compressionRequired: true,
        multiDeviceSync: false,
        coldArchiveEnabled: false,
      );
      final policyLookup = InMemoryMediaPolicyLookup({'MEDIA_FI5': policy});
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );
      const media = MediaReference(
        hash: 'sha256:fi5',
        sizeBytes: 10 * 1024 * 1024,
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_FI5',
        location: PhysicalLocation.localDevice,
      );
      final decision = adapter.evaluate(media: media, userTier: UserTier.free);
      expect(decision.localOnly, isTrue);
      final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);
      final opPlan = materializationEngine.buildOperationPlan(lifecyclePlan, mediaId: media.hash);
      const execAdapter = SimulatedExecutionAdapter.allSuccess();
      final trace = await orchestrator.executePlan(opPlan, execAdapter);
      expect(trace.allSucceeded, isTrue);
      expect(trace.isComplete, isTrue);
    });
    test('same input produces identical trace', () async {
      final snapshot = _createSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      const policy = MediaStoragePolicy(
        id: 'MEDIA_FI5',
        version: '1.0.0',
        storageMode: StorageMode.deviceOnly,
        maxFileSizeMB: 50,
        retentionPolicy: RetentionLocalOnly(),
        compressionRequired: true,
        multiDeviceSync: false,
        coldArchiveEnabled: false,
      );
      final policyLookup = InMemoryMediaPolicyLookup({'MEDIA_FI5': policy});
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );
      const media = MediaReference(
        hash: 'sha256:same',
        sizeBytes: 1024,
        mimeType: 'image/png',
        mediaPolicyId: 'MEDIA_FI5',
        location: PhysicalLocation.localDevice,
      );
      final plan1 = lifecycleEngine.buildPlan(media, adapter.evaluate(media: media, userTier: UserTier.free));
      final plan2 = lifecycleEngine.buildPlan(media, adapter.evaluate(media: media, userTier: UserTier.free));
      final op1 = materializationEngine.buildOperationPlan(plan1, mediaId: media.hash);
      final op2 = materializationEngine.buildOperationPlan(plan2, mediaId: media.hash);
      expect(op1, equals(op2));
      final t1 = await orchestrator.executePlan(op1, const SimulatedExecutionAdapter.allSuccess());
      final t2 = await orchestrator.executePlan(op2, const SimulatedExecutionAdapter.allSuccess());
      expect(t1.executedCount, t2.executedCount);
      expect(t1.allSucceeded, t2.allSucceeded);
    });
  });
}
