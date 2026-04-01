// FASE I5 - E2E Deterministic Flow Test.

import 'dart:io';

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

void main() {
  // Test policies for each tier
  const policyFree = MediaStoragePolicy(
    id: 'MEDIA_FREE_V1',
    version: '1.0.0',
    storageMode: StorageMode.deviceOnly,
    maxFileSizeMB: 50,
    retentionPolicy: RetentionLocalOnly(),
    compressionRequired: true,
    multiDeviceSync: false,
    coldArchiveEnabled: false,
  );

  const policyPro = MediaStoragePolicy(
    id: 'MEDIA_PRO_V1',
    version: '1.0.0',
    storageMode: StorageMode.cloud,
    maxFileSizeMB: 500,
    retentionPolicy: RetentionDaysLimited(90),
    compressionRequired: false,
    multiDeviceSync: true,
    coldArchiveEnabled: false,
  );

  const policyEnterprise = MediaStoragePolicy(
    id: 'MEDIA_ENTERPRISE_V1',
    version: '1.0.0',
    storageMode: StorageMode.tiered,
    maxFileSizeMB: 5000,
    retentionPolicy: RetentionConfigurable(),
    compressionRequired: false,
    multiDeviceSync: true,
    coldArchiveEnabled: true,
  );

  // Policy lookup table
  final policyLookup = InMemoryMediaPolicyLookup({
    policyFree.id: policyFree,
    policyPro.id: policyPro,
    policyEnterprise.id: policyEnterprise,
  });

  // Helper to create governance snapshot
  GovernanceSnapshot createTestSnapshot() {
    const version = GovernanceVersion(major: 1, minor: 1, patch: 0);
    final capturedAt = DateTime.utc(2026, 1, 1, 12, 0, 0);

    final impactReport = GovernanceImpactReport(
      gcpId: const GCPId('GCP-E2E-TEST'),
      fromVersion: const GovernanceVersion(major: 1, minor: 0, patch: 0),
      toVersion: version,
      impacts: const [],
    );

    final decision = GovernanceDecision(
      gcpId: const GCPId('GCP-E2E-TEST'),
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
      activeMediaPolicyIds: [policyFree.id, policyPro.id, policyEnterprise.id],
      activeTierBindings: const [
        UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1'),
        UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
        UserTierBinding(
            tier: UserTier.enterprise, mediaPolicyId: 'MEDIA_ENTERPRISE_V1'),
      ],
    );
  }

  // Engines
  const lifecycleEngine = MediaLifecycleEngine();
  const materializationEngine = MediaMaterializationEngine();
  const orchestrator = MediaExecutionOrchestrator();

  group('E2E Flow - Basic Success', () {
    test('free tier: local-only flow succeeds', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:abc123',
        sizeBytes: 10 * 1024 * 1024, // 10 MB within 50 MB limit
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_FREE_V1',
        location: PhysicalLocation.localDevice,
      );

      // Step 1: Enforcement
      final decision = adapter.evaluate(media: media, userTier: UserTier.free);
      expect(decision.uploadAllowed, isTrue);
      expect(decision.localOnly, isTrue);
      expect(decision.cloudAllowed, isFalse);

      // Step 2: Lifecycle
      final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);
      expect(lifecyclePlan.allowsCloud, isFalse);

      // Step 3: Materialization
      final opPlan = materializationEngine.buildOperationPlan(
        lifecyclePlan,
        mediaId: media.hash,
      );
      expect(opPlan.hasCloudOperations, isFalse);

      // Step 4: Execution
      const execAdapter = SimulatedExecutionAdapter.allSuccess();
      final trace = await orchestrator.executePlan(opPlan, execAdapter);

      expect(trace.allSucceeded, isTrue);
      expect(trace.isComplete, isTrue);
    });

    test('pro tier: cloud flow succeeds', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:pro123',
        sizeBytes: 100 * 1024 * 1024, // 100 MB within 500 MB limit
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_PRO_V1',
        location: PhysicalLocation.localDevice,
      );

      final decision = adapter.evaluate(media: media, userTier: UserTier.pro);
      expect(decision.cloudAllowed, isTrue);
      expect(decision.multiDeviceSyncAllowed, isTrue);

      final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);
      expect(lifecyclePlan.allowsCloud, isTrue);

      final opPlan = materializationEngine.buildOperationPlan(
        lifecyclePlan,
        mediaId: media.hash,
      );
      expect(opPlan.hasCloudOperations, isTrue);

      const execAdapter = SimulatedExecutionAdapter.allSuccess();
      final trace = await orchestrator.executePlan(opPlan, execAdapter);

      expect(trace.allSucceeded, isTrue);
    });
  });

  group('E2E Flow - Controlled Failure', () {
    test('failure on sequence 2 stops execution', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:fail123',
        sizeBytes: 50 * 1024 * 1024,
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_ENTERPRISE_V1',
        location: PhysicalLocation.localDevice,
      );

      final decision = adapter.evaluate(
        media: media,
        userTier: UserTier.enterprise,
      );
      final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);
      final opPlan = materializationEngine.buildOperationPlan(
        lifecyclePlan,
        mediaId: media.hash,
      );

      // Configure failure on seq 2
      const execAdapter = SimulatedExecutionAdapter.failOnSequence({2});
      final trace = await orchestrator.executePlan(opPlan, execAdapter);

      expect(trace.hasFailed, isTrue);
      expect(trace.isComplete, isFalse);
      // 0, 1 succeed; 2 fails → execution stops
      expect(trace.executedCount, 3);
      expect(trace.results[0].isSuccess, isTrue);
      expect(trace.results[1].isSuccess, isTrue);
      expect(trace.results[2].isFailure, isTrue);
    });

    test('file exceeds size limit: restrictive decision', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:toobig',
        sizeBytes: 100 * 1024 * 1024, // 100 MB > 50 MB Free limit
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_FREE_V1',
        location: PhysicalLocation.localDevice,
      );

      final decision = adapter.evaluate(media: media, userTier: UserTier.free);
      expect(decision.uploadAllowed, isFalse);
    });
  });

  group('E2E Flow - Multi-tier', () {
    test('different tiers produce different decisions', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:multitier',
        sizeBytes: 30 * 1024 * 1024, // 30 MB
        mimeType: 'video/mp4',
        mediaPolicyId: 'TEST',
        location: PhysicalLocation.localDevice,
      );

      final freeDecision = adapter.evaluate(
        media: media,
        userTier: UserTier.free,
      );
      final proDecision = adapter.evaluate(
        media: media,
        userTier: UserTier.pro,
      );
      final entDecision = adapter.evaluate(
        media: media,
        userTier: UserTier.enterprise,
      );

      // Free: local only
      expect(freeDecision.localOnly, isTrue);
      expect(freeDecision.cloudAllowed, isFalse);
      expect(freeDecision.coldArchiveAllowed, isFalse);

      // Pro: cloud enabled
      expect(proDecision.localOnly, isFalse);
      expect(proDecision.cloudAllowed, isTrue);
      expect(proDecision.coldArchiveAllowed, isFalse);

      // Enterprise: cloud + archive
      expect(entDecision.localOnly, isFalse);
      expect(entDecision.cloudAllowed, isTrue);
      expect(entDecision.coldArchiveAllowed, isTrue);
    });

    test('enterprise tier produces archive operations', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:enterprise',
        sizeBytes: 100 * 1024 * 1024,
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_ENTERPRISE_V1',
        location: PhysicalLocation.localDevice,
      );

      final decision = adapter.evaluate(
        media: media,
        userTier: UserTier.enterprise,
      );
      final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);
      final opPlan = materializationEngine.buildOperationPlan(
        lifecyclePlan,
        mediaId: media.hash,
      );

      expect(opPlan.hasArchiveOperations, isTrue);
    });
  });

  group('E2E Flow - Determinism', () {
    test('same input produces identical results', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:determinism',
        sizeBytes: 20 * 1024 * 1024,
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_PRO_V1',
        location: PhysicalLocation.localDevice,
      );

      // First execution
      final decision1 = adapter.evaluate(media: media, userTier: UserTier.pro);
      final lifecycle1 = lifecycleEngine.buildPlan(media, decision1);
      final opPlan1 = materializationEngine.buildOperationPlan(
        lifecycle1,
        mediaId: media.hash,
      );
      const execAdapter1 = SimulatedExecutionAdapter.allSuccess();
      final trace1 = await orchestrator.executePlan(opPlan1, execAdapter1);

      // Second execution (identical)
      final decision2 = adapter.evaluate(media: media, userTier: UserTier.pro);
      final lifecycle2 = lifecycleEngine.buildPlan(media, decision2);
      final opPlan2 = materializationEngine.buildOperationPlan(
        lifecycle2,
        mediaId: media.hash,
      );
      const execAdapter2 = SimulatedExecutionAdapter.allSuccess();
      final trace2 = await orchestrator.executePlan(opPlan2, execAdapter2);

      // Verify identical
      expect(decision1, equals(decision2));
      expect(lifecycle1, equals(lifecycle2));
      expect(opPlan1, equals(opPlan2));
      expect(trace1, equals(trace2));
      expect(trace1.hashCode, trace2.hashCode);
    });

    test('snapshot is deterministically ordered', () {
      final snapshot1 = createTestSnapshot();
      final snapshot2 = createTestSnapshot();

      expect(
          snapshot1.activeTierBindings, equals(snapshot2.activeTierBindings));
      expect(
          snapshot1.activeMediaPolicyIds, equals(snapshot2.activeMediaPolicyIds));
    });
  });

  group('E2E Flow - Snapshot Immutability', () {
    test('snapshot activeMediaPolicyIds is immutable', () {
      final snapshot = createTestSnapshot();

      expect(
        () => snapshot.activeMediaPolicyIds.add('NEW_POLICY'),
        throwsUnsupportedError,
      );
    });

    test('snapshot activeTierBindings is immutable', () {
      final snapshot = createTestSnapshot();

      expect(
        () => snapshot.activeTierBindings.add(
          const UserTierBinding(tier: UserTier.free, mediaPolicyId: 'NEW'),
        ),
        throwsUnsupportedError,
      );
    });

    test('execution trace results are immutable', () async {
      final snapshot = createTestSnapshot();
      final policyReader = MediaPolicyReader(snapshot);
      final adapter = MediaEnforcementAdapter(
        policyReader: policyReader,
        policyLookup: policyLookup,
      );

      const media = MediaReference(
        hash: 'sha256:immut',
        sizeBytes: 10 * 1024 * 1024,
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_FREE_V1',
        location: PhysicalLocation.localDevice,
      );

      final decision = adapter.evaluate(media: media, userTier: UserTier.free);
      final lifecycle = lifecycleEngine.buildPlan(media, decision);
      final opPlan = materializationEngine.buildOperationPlan(
        lifecycle,
        mediaId: media.hash,
      );
      const execAdapter = SimulatedExecutionAdapter.allSuccess();
      final trace = await orchestrator.executePlan(opPlan, execAdapter);

      expect(
        () => trace.results.add(trace.results.first),
        throwsUnsupportedError,
      );
    });
  });

  group('E2E Flow - Snapshot H6 Coherence', () {
    test('snapshot includes all required media governance fields', () {
      final snapshot = createTestSnapshot();

      expect(snapshot.activeMediaPolicyIds, isNotEmpty);
      expect(snapshot.activeTierBindings, isNotEmpty);
      expect(snapshot.activeTierBindings.length, 3);

      // Verify tier bindings are sorted (free < pro < enterprise)
      expect(snapshot.activeTierBindings[0].tier, UserTier.free);
      expect(snapshot.activeTierBindings[1].tier, UserTier.pro);
      expect(snapshot.activeTierBindings[2].tier, UserTier.enterprise);
    });

    test('policy reader correctly reads from snapshot', () {
      final snapshot = createTestSnapshot();
      final reader = MediaPolicyReader(snapshot);

      expect(reader.getActiveMediaPolicyIds().length, 3);
      expect(reader.isPolicyActive('MEDIA_FREE_V1'), isTrue);
      expect(reader.isPolicyActive('MEDIA_PRO_V1'), isTrue);
      expect(reader.isPolicyActive('MEDIA_ENTERPRISE_V1'), isTrue);
      expect(reader.isPolicyActive('NONEXISTENT'), isFalse);

      expect(reader.bindingForTier(UserTier.free)?.mediaPolicyId,
          'MEDIA_FREE_V1');
      expect(
          reader.bindingForTier(UserTier.pro)?.mediaPolicyId, 'MEDIA_PRO_V1');
      expect(reader.bindingForTier(UserTier.enterprise)?.mediaPolicyId,
          'MEDIA_ENTERPRISE_V1');
    });
  });

  group('E2E Flow - Forbidden Guard', () {
    final mediaDirs = [
      'lib/flow_media',
      'lib/media_lifecycle',
      'lib/media_materialization',
      'lib/media_execution',
    ];

    final forbiddenPatterns = [
      (RegExp(r"import\s+'dart:io'"), 'dart:io import'),
      (RegExp(r'\bDateTime\.now\b'), 'DateTime.now'),
      (RegExp(r'\bRandom\b'), 'Random'),
      (RegExp(r'\bFile\b(?!\s*Size)'), 'File class'),
      (RegExp(r'\bDirectory\b'), 'Directory class'),
      (RegExp(r'\baws\b', caseSensitive: false), 'AWS SDK'),
      (RegExp(r'\bgcp\b', caseSensitive: false), 'GCP SDK'),
      (RegExp(r'\bazure\b', caseSensitive: false), 'Azure SDK'),
      (RegExp(r'\bfirebase\b', caseSensitive: false), 'Firebase SDK'),
      (RegExp(r'C:\\|/home/|/Users/', caseSensitive: false), 'filesystem path'),
    ];

    test('no forbidden patterns in media layer source files', () {
      final violations = <String>[];

      for (final dirPath in mediaDirs) {
        final dir = Directory(dirPath);
        if (!dir.existsSync()) continue;

        for (final file in dir.listSync(recursive: true)) {
          if (file is! File || !file.path.endsWith('.dart')) continue;

          final content = file.readAsStringSync();
          final relativePath = file.path;

          for (final (pattern, name) in forbiddenPatterns) {
            if (pattern.hasMatch(content)) {
              violations.add('$relativePath: contains $name');
            }
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('Forbidden patterns found:\n${violations.join('\n')}');
      }
    });

    test('no http/dio imports in media layers', () {
      final violations = <String>[];
      final httpPattern = RegExp(r"import\s+'package:(http|dio)");

      for (final dirPath in mediaDirs) {
        final dir = Directory(dirPath);
        if (!dir.existsSync()) continue;

        for (final file in dir.listSync(recursive: true)) {
          if (file is! File || !file.path.endsWith('.dart')) continue;

          final content = file.readAsStringSync();
          if (httpPattern.hasMatch(content)) {
            violations.add('${file.path}: contains http/dio import');
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('HTTP imports found:\n${violations.join('\n')}');
      }
    });

    test('no normative language in media enforcement', () {
      final violations = <String>[];
      final normativeWords = [
        'compliant',
        'certified',
        'approved',
        'legal',
        'illegal',
        'valid',
        'invalid',
      ];

      final dir = Directory('lib/flow_media');
      if (!dir.existsSync()) return;

      for (final file in dir.listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;

        final content = file.readAsStringSync().toLowerCase();
        for (final word in normativeWords) {
          if (RegExp('\\b$word\\b').hasMatch(content)) {
            violations.add('${file.path}: contains normative word "$word"');
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('Normative language found:\n${violations.join('\n')}');
      }
    });
  });
}
