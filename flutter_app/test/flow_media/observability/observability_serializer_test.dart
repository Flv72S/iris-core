// I7 - Tests for ObservabilitySerializer.

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_event.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_serializer.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

void main() {
  const testMediaRef = MediaReference(
    hash: 'sha256:ser123',
    sizeBytes: 16384,
    mimeType: 'application/pdf',
    mediaPolicyId: 'SER_POLICY',
    location: PhysicalLocation.localDevice,
  );

  const testTierBinding = UserTierBinding(
    tier: UserTier.enterprise,
    mediaPolicyId: 'SER_POLICY',
  );

  const testDecision = MediaEnforcementDecision(
    uploadAllowed: true,
    localOnly: false,
    cloudAllowed: true,
    compressionRequired: false,
    coldArchiveAllowed: true,
    multiDeviceSyncAllowed: true,
    maxFileSizeBytes: 1000000000,
  );

  ObservabilityEvent createEvent(String id, ObservabilityEventType type, int step) {
    return ObservabilityEvent(
      eventId: id,
      eventType: type,
      mediaRef: testMediaRef,
      tierBinding: testTierBinding,
      decision: testDecision,
      logicalStep: step,
    );
  }

  group('computeHash', () {
    test('is deterministic', () {
      const input = 'test input string';

      final hash1 = ObservabilitySerializer.computeHash(input);
      final hash2 = ObservabilitySerializer.computeHash(input);

      expect(hash1, hash2);
    });

    test('different inputs produce different hashes', () {
      final hash1 = ObservabilitySerializer.computeHash('input A');
      final hash2 = ObservabilitySerializer.computeHash('input B');

      expect(hash1, isNot(hash2));
    });

    test('produces non-empty hash', () {
      final hash = ObservabilitySerializer.computeHash('test');

      expect(hash, isNotEmpty);
    });
  });

  group('computeEventHash', () {
    test('is deterministic for same event', () {
      final event = createEvent('ev-hash', ObservabilityEventType.executionStarted, 0);

      final hash1 = ObservabilitySerializer.computeEventHash(event);
      final hash2 = ObservabilitySerializer.computeEventHash(event);

      expect(hash1, hash2);
    });

    test('different events produce different hashes', () {
      final event1 = createEvent('ev-1', ObservabilityEventType.executionStarted, 0);
      final event2 = createEvent('ev-2', ObservabilityEventType.executionStarted, 0);

      final hash1 = ObservabilitySerializer.computeEventHash(event1);
      final hash2 = ObservabilitySerializer.computeEventHash(event2);

      expect(hash1, isNot(hash2));
    });

    test('is stable regardless of JSON key order', () {
      final event = createEvent('ev-order', ObservabilityEventType.operationCompleted, 5);

      final hash1 = ObservabilitySerializer.computeEventHash(event);

      final json = event.toJson();
      final reorderedJson = <String, dynamic>{
        'logicalStep': json['logicalStep'],
        'eventId': json['eventId'],
        'metadata': json['metadata'],
        'eventType': json['eventType'],
        'mediaRef': json['mediaRef'],
        'tierBinding': json['tierBinding'],
        'decision': json['decision'],
        'failure': json['failure'],
      };

      final eventFromReordered = ObservabilityEvent(
        eventId: reorderedJson['eventId'] as String,
        eventType: ObservabilityEventType.values.firstWhere(
          (e) => e.name == reorderedJson['eventType'],
        ),
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: reorderedJson['logicalStep'] as int,
      );

      final hash2 = ObservabilitySerializer.computeEventHash(eventFromReordered);

      expect(hash1, hash2);
    });
  });

  group('eventToJsonString', () {
    test('produces valid JSON', () {
      final event = createEvent('json-str', ObservabilityEventType.lifecycleTransition, 3);

      final jsonStr = ObservabilitySerializer.eventToJsonString(event);

      expect(() => jsonDecode(jsonStr), returnsNormally);
    });

    test('includes all event fields', () {
      final event = createEvent('json-fields', ObservabilityEventType.operationStarted, 2);

      final jsonStr = ObservabilitySerializer.eventToJsonString(event);
      final json = jsonDecode(jsonStr) as Map<String, dynamic>;

      expect(json['eventId'], 'json-fields');
      expect(json['eventType'], 'operationStarted');
      expect(json['logicalStep'], 2);
    });
  });

  group('eventFromJson', () {
    test('roundtrip serialization works', () {
      final original = createEvent('roundtrip', ObservabilityEventType.executionCompleted, 10);

      final json = original.toJson();
      final restored = ObservabilitySerializer.eventFromJson(json);

      expect(restored.eventId, original.eventId);
      expect(restored.eventType, original.eventType);
      expect(restored.logicalStep, original.logicalStep);
    });

    test('handles event with failure', () {
      final original = ObservabilityEvent(
        eventId: 'fail-rt',
        eventType: ObservabilityEventType.operationFailed,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 5,
        failure: FailureResult.networkError('Connection timeout'),
      );

      final json = original.toJson();
      final restored = ObservabilitySerializer.eventFromJson(json);

      expect(restored.isFailure, isTrue);
      expect(restored.failure?.type, FailureType.networkError);
      expect(restored.failure?.message, 'Connection timeout');
    });

    test('handles event with metadata', () {
      const original = ObservabilityEvent(
        eventId: 'meta-rt',
        eventType: ObservabilityEventType.lifecycleTransition,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 3,
        metadata: {'key1': 'value1', 'key2': 42},
      );

      final json = original.toJson();
      final restored = ObservabilitySerializer.eventFromJson(json);

      expect(restored.metadata['key1'], 'value1');
      expect(restored.metadata['key2'], 42);
    });
  });

  group('computeHashChain', () {
    test('is deterministic', () {
      final events = [
        createEvent('chain-1', ObservabilityEventType.executionStarted, 0),
        createEvent('chain-2', ObservabilityEventType.operationStarted, 1),
        createEvent('chain-3', ObservabilityEventType.operationCompleted, 2),
      ];

      final hash1 = ObservabilitySerializer.computeHashChain(events);
      final hash2 = ObservabilitySerializer.computeHashChain(events);

      expect(hash1, hash2);
    });

    test('order matters', () {
      final event1 = createEvent('ord-1', ObservabilityEventType.executionStarted, 0);
      final event2 = createEvent('ord-2', ObservabilityEventType.executionCompleted, 1);

      final hash1 = ObservabilitySerializer.computeHashChain([event1, event2]);
      final hash2 = ObservabilitySerializer.computeHashChain([event2, event1]);

      expect(hash1, isNot(hash2));
    });

    test('empty list produces consistent hash', () {
      final hash1 = ObservabilitySerializer.computeHashChain([]);
      final hash2 = ObservabilitySerializer.computeHashChain([]);

      expect(hash1, hash2);
      expect(hash1, isNotEmpty);
    });
  });

  group('verifyEventHash', () {
    test('returns true for correct hash', () {
      final event = createEvent('verify-ok', ObservabilityEventType.enforcementDecision, 0);
      final hash = ObservabilitySerializer.computeEventHash(event);

      expect(ObservabilitySerializer.verifyEventHash(event, hash), isTrue);
    });

    test('returns false for incorrect hash', () {
      final event = createEvent('verify-fail', ObservabilityEventType.enforcementDecision, 0);

      expect(ObservabilitySerializer.verifyEventHash(event, 'wrong_hash'), isFalse);
    });
  });

  group('Integration', () {
    test('serialization roundtrip preserves hash', () {
      final original = createEvent('full-rt', ObservabilityEventType.operationCompleted, 7);
      final originalHash = ObservabilitySerializer.computeEventHash(original);

      final jsonStr = ObservabilitySerializer.eventToJsonString(original);
      final json = jsonDecode(jsonStr) as Map<String, dynamic>;
      final restored = ObservabilitySerializer.eventFromJson(json);
      final restoredHash = ObservabilitySerializer.computeEventHash(restored);

      expect(restoredHash, originalHash);
    });

    test('chain hash matches across identical sequences', () {
      List<ObservabilityEvent> createSequence() {
        return [
          createEvent('seq-1', ObservabilityEventType.executionStarted, 0),
          createEvent('seq-2', ObservabilityEventType.enforcementDecision, 1),
          createEvent('seq-3', ObservabilityEventType.lifecycleTransition, 2),
          createEvent('seq-4', ObservabilityEventType.operationStarted, 3),
          createEvent('seq-5', ObservabilityEventType.operationCompleted, 4),
          createEvent('seq-6', ObservabilityEventType.executionCompleted, 5),
        ];
      }

      final seq1 = createSequence();
      final seq2 = createSequence();

      final hash1 = ObservabilitySerializer.computeHashChain(seq1);
      final hash2 = ObservabilitySerializer.computeHashChain(seq2);

      expect(hash1, hash2);
    });
  });
}
