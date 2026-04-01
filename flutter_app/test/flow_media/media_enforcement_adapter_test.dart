// F-Media — MediaEnforcementAdapter determinism and tier binding coherence.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_adapter.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_policy_lookup.dart';
import 'package:iris_flutter_app/flow_media/media_policy_reader.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_activation_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/media_storage_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/retention_policy.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/storage_mode.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';
import 'package:iris_flutter_app/meta_governance/impact/governance_impact_report.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

void main() {
  late GovernanceSnapshot snapshot;
  late Map<String, MediaStoragePolicy> policies;

  setUp(() {
    const v = GovernanceVersion(major: 1, minor: 0, patch: 0);
    final impact = GovernanceImpactReport(
      gcpId: const GCPId('GCP-TEST'),
      fromVersion: v,
      toVersion: v,
      impacts: const [],
    );
    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-TEST'),
      status: GovernanceDecisionStatus.approved,
      votes: const [],
      impactReport: impact,
      decidedAt: DateTime.utc(2026, 1, 1),
    );
    final rat = GovernanceRatificationRecord(
      decision: decision,
      previousVersion: v,
      newVersion: v,
      ratifiedAt: DateTime.utc(2026, 1, 1),
    );
    snapshot = GovernanceSnapshot(
      version: v,
      capturedAt: DateTime.utc(2026, 1, 1),
      source: rat,
      activeProposals: const [],
      activeDecisions: [decision],
      activePolicies: const {},
      activeMediaPolicyIds: ['MEDIA_FREE_V1', 'MEDIA_PRO_V1'],
      activeTierBindings: [
        UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
        UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
      ],
    );
    policies = {
      'MEDIA_FREE_V1': MediaStoragePolicy(
        id: 'MEDIA_FREE_V1',
        version: '1.0.0',
        storageMode: StorageMode.deviceOnly,
        maxFileSizeMB: 10,
        retentionPolicy: RetentionLocalOnly(),
        compressionRequired: true,
        multiDeviceSync: false,
        coldArchiveEnabled: false,
      ),
      'MEDIA_PRO_V1': MediaStoragePolicy(
        id: 'MEDIA_PRO_V1',
        version: '1.0.0',
        storageMode: StorageMode.cloud,
        maxFileSizeMB: 100,
        retentionPolicy: RetentionDaysLimited(365),
        compressionRequired: true,
        multiDeviceSync: true,
        coldArchiveEnabled: false,
      ),
    };
  });

  test('same inputs produce same decision (determinism)', () {
    final reader = MediaPolicyReader(snapshot);
    final lookup = InMemoryMediaPolicyLookup(policies);
    final adapter = MediaEnforcementAdapter(policyReader: reader, policyLookup: lookup);
    const media = MediaReference(
      hash: 'sha256:abc',
      sizeBytes: 5 * 1024 * 1024,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_FREE_V1',
      location: PhysicalLocation.localDevice,
    );
    final d1 = adapter.evaluate(media: media, userTier: UserTier.free);
    final d2 = adapter.evaluate(media: media, userTier: UserTier.free);
    expect(d1, d2);
    expect(d1.hashCode, d2.hashCode);
  });

  test('free tier: localOnly true, cloudAllowed false', () {
    final reader = MediaPolicyReader(snapshot);
    final lookup = InMemoryMediaPolicyLookup(policies);
    final adapter = MediaEnforcementAdapter(policyReader: reader, policyLookup: lookup);
    const media = MediaReference(
      hash: 'sha256:xyz',
      sizeBytes: 1024,
      mimeType: 'image/png',
      mediaPolicyId: 'MEDIA_FREE_V1',
      location: PhysicalLocation.localDevice,
    );
    final decision = adapter.evaluate(media: media, userTier: UserTier.free);
    expect(decision.localOnly, true);
    expect(decision.cloudAllowed, false);
    expect(decision.uploadAllowed, true);
    expect(decision.compressionRequired, true);
  });

  test('pro tier: cloudAllowed true, multiDeviceSyncAllowed true', () {
    final reader = MediaPolicyReader(snapshot);
    final lookup = InMemoryMediaPolicyLookup(policies);
    final adapter = MediaEnforcementAdapter(policyReader: reader, policyLookup: lookup);
    const media = MediaReference(
      hash: 'sha256:pro',
      sizeBytes: 50 * 1024 * 1024,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_PRO_V1',
      location: PhysicalLocation.cloud,
    );
    final decision = adapter.evaluate(media: media, userTier: UserTier.pro);
    expect(decision.localOnly, false);
    expect(decision.cloudAllowed, true);
    expect(decision.uploadAllowed, true);
    expect(decision.multiDeviceSyncAllowed, true);
  });

  test('file exceeds maxFileSizeMB: uploadAllowed false', () {
    final reader = MediaPolicyReader(snapshot);
    final lookup = InMemoryMediaPolicyLookup(policies);
    final adapter = MediaEnforcementAdapter(policyReader: reader, policyLookup: lookup);
    const media = MediaReference(
      hash: 'sha256:big',
      sizeBytes: 15 * 1024 * 1024,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_FREE_V1',
      location: PhysicalLocation.localDevice,
    );
    final decision = adapter.evaluate(media: media, userTier: UserTier.free);
    expect(decision.uploadAllowed, false);
  });

  test('tier without binding: restrictive decision', () {
    final reader = MediaPolicyReader(snapshot);
    final lookup = InMemoryMediaPolicyLookup(policies);
    final adapter = MediaEnforcementAdapter(policyReader: reader, policyLookup: lookup);
    const media = MediaReference(
      hash: 'sha256:ent',
      sizeBytes: 1024,
      mimeType: 'image/png',
      mediaPolicyId: 'MEDIA_ENTERPRISE_V1',
      location: PhysicalLocation.cloud,
    );
    final decision = adapter.evaluate(media: media, userTier: UserTier.enterprise);
    expect(decision, MediaEnforcementDecision.restrictive);
  });

  test('policy not in activeMediaPolicyIds: restrictive decision', () {
    final snapshotNoActive = GovernanceSnapshot(
      version: snapshot.version,
      capturedAt: snapshot.capturedAt,
      source: snapshot.source,
      activeProposals: const [],
      activeDecisions: snapshot.activeDecisions,
      activePolicies: const {},
      activeMediaPolicyIds: const [],
      activeTierBindings: [
        UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
      ],
    );
    final reader = MediaPolicyReader(snapshotNoActive);
    final lookup = InMemoryMediaPolicyLookup(policies);
    final adapter = MediaEnforcementAdapter(policyReader: reader, policyLookup: lookup);
    const media = MediaReference(
      hash: 'sha256:na',
      sizeBytes: 1024,
      mimeType: 'image/png',
      mediaPolicyId: 'MEDIA_FREE_V1',
      location: PhysicalLocation.localDevice,
    );
    final decision = adapter.evaluate(media: media, userTier: UserTier.free);
    expect(decision, MediaEnforcementDecision.restrictive);
  });
}
