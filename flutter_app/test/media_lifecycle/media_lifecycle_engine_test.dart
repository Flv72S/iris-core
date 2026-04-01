import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_engine.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';

void main() {
  const engine = MediaLifecycleEngine();

  MediaReference createMedia() {
    return const MediaReference(
      hash: 'sha256:abc123',
      sizeBytes: 1024000,
      mimeType: 'video/mp4',
      mediaPolicyId: 'MEDIA_TEST_V1',
      location: PhysicalLocation.localDevice,
    );
  }

  group('MediaLifecycleEngine - Determinism', () {
    test('same inputs produce same plan', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: true,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan1 = engine.buildPlan(media, decision);
      final plan2 = engine.buildPlan(media, decision);

      expect(plan1, equals(plan2));
      expect(plan1.hashCode, plan2.hashCode);
    });

    test('same decision different media produces consistent structure', () {
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: false,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      const media1 = MediaReference(
        hash: 'sha256:aaa',
        sizeBytes: 1000,
        mimeType: 'image/png',
        mediaPolicyId: 'MEDIA_A',
        location: PhysicalLocation.localDevice,
      );
      const media2 = MediaReference(
        hash: 'sha256:bbb',
        sizeBytes: 2000,
        mimeType: 'image/jpg',
        mediaPolicyId: 'MEDIA_B',
        location: PhysicalLocation.localDevice,
      );

      final plan1 = engine.buildPlan(media1, decision);
      final plan2 = engine.buildPlan(media2, decision);

      expect(plan1.transitions.length, plan2.transitions.length);
      expect(plan1.allowsCloud, plan2.allowsCloud);
      expect(plan1.includesArchive, plan2.includesArchive);
    });
  });

  group('MediaLifecycleEngine - Local-only', () {
    test('localOnly decision produces no cloud transitions', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: false,
        localOnly: true,
        cloudAllowed: false,
        compressionRequired: true,
        coldArchiveAllowed: false,
        multiDeviceSyncAllowed: false,
        maxFileSizeBytes: 0,
      );

      final plan = engine.buildPlan(media, decision);

      expect(plan.allowsCloud, isFalse);
      expect(plan.includesArchive, isFalse);
      expect(
        plan.transitions.any((t) => t.to == MediaLifecycleState.syncing),
        isFalse,
      );
      expect(
        plan.transitions.any((t) => t.to == MediaLifecycleState.cloudStored),
        isFalse,
      );
    });

    test('localOnly plan still reaches deleted state', () {
      final media = createMedia();
      final plan = engine.buildPlan(media, MediaEnforcementDecision.restrictive);

      expect(plan.terminalState, MediaLifecycleState.deleted);
      expect(
        plan.transitions.any((t) => t.to == MediaLifecycleState.pendingDeletion),
        isTrue,
      );
    });
  });

  group('MediaLifecycleEngine - Cloud enabled', () {
    test('cloudAllowed decision includes syncing and cloudStored', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: false,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan = engine.buildPlan(media, decision);

      expect(plan.allowsCloud, isTrue);
      expect(
        plan.transitions.any((t) => t.to == MediaLifecycleState.syncing),
        isTrue,
      );
      expect(
        plan.transitions.any((t) => t.to == MediaLifecycleState.cloudStored),
        isTrue,
      );
    });

    test('cloud plan includes upload failure fallback', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: false,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan = engine.buildPlan(media, decision);

      expect(
        plan.transitions.any(
          (t) =>
              t.from == MediaLifecycleState.syncing &&
              t.to == MediaLifecycleState.localOnly,
        ),
        isTrue,
      );
    });
  });

  group('MediaLifecycleEngine - Retention / Archive', () {
    test('coldArchiveAllowed includes archive transitions', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: true,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan = engine.buildPlan(media, decision);

      expect(plan.includesArchive, isTrue);
      expect(
        plan.transitions.any((t) => t.to == MediaLifecycleState.coldArchived),
        isTrue,
      );
      expect(
        plan.transitions.any(
          (t) =>
              t.from == MediaLifecycleState.coldArchived &&
              t.to == MediaLifecycleState.pendingDeletion,
        ),
        isTrue,
      );
    });

    test('no archive when coldArchiveAllowed is false', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: false,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan = engine.buildPlan(media, decision);

      expect(plan.includesArchive, isFalse);
    });

    test('retention path from cloudStored when no archive', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: false,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan = engine.buildPlan(media, decision);

      expect(
        plan.transitions.any(
          (t) =>
              t.from == MediaLifecycleState.cloudStored &&
              t.to == MediaLifecycleState.pendingDeletion,
        ),
        isTrue,
      );
    });
  });

  group('MediaLifecycleEngine - Initial state', () {
    test('plan always starts with captured state', () {
      final media = createMedia();
      const decision = MediaEnforcementDecision(
        uploadAllowed: true,
        localOnly: false,
        cloudAllowed: true,
        compressionRequired: false,
        coldArchiveAllowed: true,
        multiDeviceSyncAllowed: true,
        maxFileSizeBytes: 100000000,
      );

      final plan = engine.buildPlan(media, decision);

      expect(plan.initial, MediaLifecycleState.captured);
      expect(plan.transitions.first.from, MediaLifecycleState.captured);
    });
  });
}
