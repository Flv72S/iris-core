// FASE I — I7 Observability Hook integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_event.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_hook.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_logger.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_serializer.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

void main() {
  const mediaRef = MediaReference(
    hash: 'sha256:obs',
    sizeBytes: 1024,
    mimeType: 'video/mp4',
    mediaPolicyId: 'P',
    location: PhysicalLocation.localDevice,
  );
  const tierBinding = UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'P');
  const decision = MediaEnforcementDecision(
    uploadAllowed: true,
    localOnly: false,
    cloudAllowed: true,
    compressionRequired: false,
    coldArchiveAllowed: false,
    multiDeviceSyncAllowed: true,
    maxFileSizeBytes: 100000000,
  );

  group('I7 — Observability Hook', () {
    test('event capture correct', () {
      final hook = CollectingObservabilityHook();
      final event = ObservabilityEvent(
        eventId: 'e1',
        eventType: ObservabilityEventType.executionStarted,
        mediaRef: mediaRef,
        tierBinding: tierBinding,
        decision: decision,
        logicalStep: 0,
      );
      hook.onEvent(event);
      expect(hook.events.length, 1);
      expect(hook.events[0].eventId, 'e1');
    });
    test('log immutable hash stable', () {
      final logger = ObservabilityLogger();
      final event = ObservabilityEvent(
        eventId: 'e2',
        eventType: ObservabilityEventType.operationCompleted,
        mediaRef: mediaRef,
        tierBinding: tierBinding,
        decision: decision,
        logicalStep: 1,
      );
      logger.onEvent(event);
      final log = logger.log;
      expect(log.length, 1);
      expect(log.logHash, isNotEmpty);
      final hash1 = ObservabilitySerializer.computeEventHash(event);
      expect(log.entries[0].eventHash, hash1);
    });
    test('deterministic ordering', () {
      final hook = CollectingObservabilityHook();
      for (int i = 0; i < 3; i++) {
        hook.onEvent(ObservabilityEvent(
          eventId: 'ord-$i',
          eventType: ObservabilityEventType.operationStarted,
          mediaRef: mediaRef,
          tierBinding: tierBinding,
          decision: decision,
          logicalStep: i,
        ));
      }
      expect(hook.events[0].logicalStep, 0);
      expect(hook.events[1].logicalStep, 1);
      expect(hook.events[2].logicalStep, 2);
    });
  });
}
