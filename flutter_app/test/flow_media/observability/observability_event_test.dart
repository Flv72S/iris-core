// I7 - Tests for ObservabilityEvent.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_event.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

void main() {
  const testMediaRef = MediaReference(
    hash: 'sha256:test123',
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

  group('ObservabilityEventType', () {
    test('has all expected values', () {
      expect(ObservabilityEventType.values.length, 7);
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.enforcementDecision));
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.lifecycleTransition));
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.operationStarted));
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.operationCompleted));
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.operationFailed));
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.executionStarted));
      expect(ObservabilityEventType.values, contains(ObservabilityEventType.executionCompleted));
    });
  });

  group('ObservabilityEvent', () {
    test('is immutable', () {
      const event = ObservabilityEvent(
        eventId: 'evt-001',
        eventType: ObservabilityEventType.enforcementDecision,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 0,
      );

      expect(event.eventId, 'evt-001');
      expect(event.eventType, ObservabilityEventType.enforcementDecision);
      expect(event.logicalStep, 0);
      expect(event.failure, isNull);
      expect(event.isSuccess, isTrue);
      expect(event.isFailure, isFalse);
    });

    test('equality works correctly', () {
      const event1 = ObservabilityEvent(
        eventId: 'evt-001',
        eventType: ObservabilityEventType.operationCompleted,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 5,
      );

      const event2 = ObservabilityEvent(
        eventId: 'evt-001',
        eventType: ObservabilityEventType.operationCompleted,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 5,
      );

      const event3 = ObservabilityEvent(
        eventId: 'evt-002',
        eventType: ObservabilityEventType.operationCompleted,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 5,
      );

      expect(event1, equals(event2));
      expect(event1, isNot(equals(event3)));
    });

    test('hashCode is deterministic', () {
      const event1 = ObservabilityEvent(
        eventId: 'evt-hash',
        eventType: ObservabilityEventType.executionStarted,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 10,
      );

      const event2 = ObservabilityEvent(
        eventId: 'evt-hash',
        eventType: ObservabilityEventType.executionStarted,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 10,
      );

      expect(event1.hashCode, event2.hashCode);
    });

    test('with failure has correct state', () {
      final failure = FailureResult.networkError('Connection lost');

      final event = ObservabilityEvent(
        eventId: 'evt-fail',
        eventType: ObservabilityEventType.operationFailed,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 3,
        failure: failure,
      );

      expect(event.isFailure, isTrue);
      expect(event.isSuccess, isFalse);
      expect(event.failure?.type, FailureType.networkError);
    });

    test('with metadata stores correctly', () {
      const event = ObservabilityEvent(
        eventId: 'evt-meta',
        eventType: ObservabilityEventType.lifecycleTransition,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 1,
        metadata: {'fromState': 'captured', 'toState': 'localOnly'},
      );

      expect(event.metadata['fromState'], 'captured');
      expect(event.metadata['toState'], 'localOnly');
    });

    test('toJson serializes correctly', () {
      const event = ObservabilityEvent(
        eventId: 'evt-json',
        eventType: ObservabilityEventType.enforcementDecision,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 0,
      );

      final json = event.toJson();

      expect(json['eventId'], 'evt-json');
      expect(json['eventType'], 'enforcementDecision');
      expect(json['logicalStep'], 0);
      expect(json['failure'], isNull);
      expect(json['mediaRef'], isA<Map>());
      expect(json['tierBinding'], isA<Map>());
      expect(json['decision'], isA<Map>());
    });

    test('toString provides useful output', () {
      const event = ObservabilityEvent(
        eventId: 'evt-str',
        eventType: ObservabilityEventType.operationCompleted,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 7,
      );

      final str = event.toString();

      expect(str, contains('evt-str'));
      expect(str, contains('operationCompleted'));
      expect(str, contains('7'));
    });
  });
}
