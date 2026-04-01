// I7 - Tests for ObservabilityLogger.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_event.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_logger.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

void main() {
  const testMediaRef = MediaReference(
    hash: 'sha256:log123',
    sizeBytes: 8192,
    mimeType: 'video/webm',
    mediaPolicyId: 'LOG_POLICY',
    location: PhysicalLocation.coldArchive,
  );

  const testTierBinding = UserTierBinding(
    tier: UserTier.pro,
    mediaPolicyId: 'LOG_POLICY',
  );

  const testDecision = MediaEnforcementDecision(
    uploadAllowed: true,
    localOnly: false,
    cloudAllowed: true,
    compressionRequired: false,
    coldArchiveAllowed: true,
    multiDeviceSyncAllowed: true,
    maxFileSizeBytes: 200000000,
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

  group('ObservabilityLogEntry', () {
    test('is immutable', () {
      final event = createEvent('entry-1', ObservabilityEventType.executionStarted, 0);
      final entry = ObservabilityLogEntry(
        sequenceNumber: 0,
        event: event,
        eventHash: 'hash123',
      );

      expect(entry.sequenceNumber, 0);
      expect(entry.event, event);
      expect(entry.eventHash, 'hash123');
    });

    test('toJson serializes correctly', () {
      final event = createEvent('entry-json', ObservabilityEventType.operationStarted, 1);
      final entry = ObservabilityLogEntry(
        sequenceNumber: 5,
        event: event,
        eventHash: 'hashABC',
      );

      final json = entry.toJson();

      expect(json['sequenceNumber'], 5);
      expect(json['eventHash'], 'hashABC');
      expect(json['event'], isA<Map>());
    });
  });

  group('ObservabilityLog', () {
    test('is immutable', () {
      final event = createEvent('log-1', ObservabilityEventType.executionStarted, 0);
      final entry = ObservabilityLogEntry(
        sequenceNumber: 0,
        event: event,
        eventHash: 'h1',
      );

      final log = ObservabilityLog([entry]);

      expect(log.entries.length, 1);
      expect(log.logHash, isNotEmpty);
    });

    test('isEmpty returns correct value', () {
      final emptyLog = const ObservabilityLog.empty();
      expect(emptyLog.isEmpty, isTrue);

      final event = createEvent('log-2', ObservabilityEventType.executionStarted, 0);
      final entry = ObservabilityLogEntry(
        sequenceNumber: 0,
        event: event,
        eventHash: 'h2',
      );
      final nonEmptyLog = ObservabilityLog([entry]);
      expect(nonEmptyLog.isEmpty, isFalse);
    });

    test('length returns correct value', () {
      final events = [
        createEvent('len-1', ObservabilityEventType.executionStarted, 0),
        createEvent('len-2', ObservabilityEventType.operationStarted, 1),
        createEvent('len-3', ObservabilityEventType.operationCompleted, 2),
      ];

      final entries = events.asMap().entries.map((e) => ObservabilityLogEntry(
        sequenceNumber: e.key,
        event: e.value,
        eventHash: 'h${e.key}',
      )).toList();

      final log = ObservabilityLog(entries);

      expect(log.length, 3);
    });

    test('toJson serializes correctly', () {
      final event = createEvent('json-1', ObservabilityEventType.executionCompleted, 0);
      final entry = ObservabilityLogEntry(
        sequenceNumber: 0,
        event: event,
        eventHash: 'jh1',
      );

      final log = ObservabilityLog([entry]);

      final json = log.toJson();

      expect(json['logHash'], isNotEmpty);
      expect(json['entries'], isA<List>());
      expect((json['entries'] as List).length, 1);
    });
  });

  group('ObservabilityLogBuilder', () {
    test('builds log with sequential entries', () {
      final builder = ObservabilityLogBuilder();

      builder.onEvent(createEvent('build-1', ObservabilityEventType.executionStarted, 0));
      builder.onEvent(createEvent('build-2', ObservabilityEventType.operationStarted, 1));
      builder.onEvent(createEvent('build-3', ObservabilityEventType.operationCompleted, 2));

      final log = builder.build();

      expect(log.length, 3);
      expect(log.entries[0].sequenceNumber, 0);
      expect(log.entries[1].sequenceNumber, 1);
      expect(log.entries[2].sequenceNumber, 2);
    });

    test('computes event hashes', () {
      final builder = ObservabilityLogBuilder();

      builder.onEvent(createEvent('hash-1', ObservabilityEventType.executionStarted, 0));

      final log = builder.build();

      expect(log.entries[0].eventHash, isNotEmpty);
    });

    test('computes log hash', () {
      final builder = ObservabilityLogBuilder();

      builder.onEvent(createEvent('lh-1', ObservabilityEventType.executionStarted, 0));
      builder.onEvent(createEvent('lh-2', ObservabilityEventType.executionCompleted, 1));

      final log = builder.build();

      expect(log.logHash, isNotEmpty);
    });

    test('log hash is deterministic', () {
      final builder1 = ObservabilityLogBuilder();
      final builder2 = ObservabilityLogBuilder();

      builder1.onEvent(createEvent('det-1', ObservabilityEventType.executionStarted, 0));
      builder1.onEvent(createEvent('det-2', ObservabilityEventType.executionCompleted, 1));

      builder2.onEvent(createEvent('det-1', ObservabilityEventType.executionStarted, 0));
      builder2.onEvent(createEvent('det-2', ObservabilityEventType.executionCompleted, 1));

      final log1 = builder1.build();
      final log2 = builder2.build();

      expect(log1.logHash, log2.logHash);
    });
  });

  group('ObservabilityLogger', () {
    test('delegates to builder', () {
      final logger = ObservabilityLogger();

      logger.onEvent(createEvent('log-a', ObservabilityEventType.executionStarted, 0));
      logger.onEvent(createEvent('log-b', ObservabilityEventType.operationStarted, 1));

      final log = logger.log;

      expect(log.length, 2);
    });

    test('current log is snapshot', () {
      final logger = ObservabilityLogger();

      logger.onEvent(createEvent('snap-1', ObservabilityEventType.executionStarted, 0));
      final snapshot1 = logger.log;

      logger.onEvent(createEvent('snap-2', ObservabilityEventType.executionCompleted, 1));
      final snapshot2 = logger.log;

      expect(snapshot1.length, 1);
      expect(snapshot2.length, 2);
    });

    test('length is accurate', () {
      final logger = ObservabilityLogger();

      expect(logger.length, 0);

      logger.onEvent(createEvent('cnt-1', ObservabilityEventType.executionStarted, 0));
      expect(logger.length, 1);

      logger.onEvent(createEvent('cnt-2', ObservabilityEventType.executionCompleted, 1));
      expect(logger.length, 2);
    });
  });

  group('Logger Integration', () {
    test('failure events are logged correctly', () {
      final logger = ObservabilityLogger();

      logger.onEvent(createEvent('int-1', ObservabilityEventType.operationStarted, 0));

      final failEvent = ObservabilityEvent(
        eventId: 'int-fail',
        eventType: ObservabilityEventType.operationFailed,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 1,
        failure: FailureResult.storageUnavailable('Disk full'),
      );
      logger.onEvent(failEvent);

      final log = logger.log;

      expect(log.length, 2);
      expect(log.entries[1].event.isFailure, isTrue);
    });

    test('log maintains chronological order', () {
      final logger = ObservabilityLogger();

      for (int i = 0; i < 10; i++) {
        logger.onEvent(createEvent('chron-$i', ObservabilityEventType.operationStarted, i));
      }

      final log = logger.log;

      for (int i = 0; i < 10; i++) {
        expect(log.entries[i].sequenceNumber, i);
        expect(log.entries[i].event.eventId, 'chron-$i');
      }
    });
  });
}
