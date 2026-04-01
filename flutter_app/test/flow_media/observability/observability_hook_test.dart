// I7 - Tests for ObservabilityHook implementations.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_event.dart';
import 'package:iris_flutter_app/flow_media/observability/observability_hook.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

void main() {
  const testMediaRef = MediaReference(
    hash: 'sha256:hook123',
    sizeBytes: 4096,
    mimeType: 'audio/mp3',
    mediaPolicyId: 'HOOK_POLICY',
    location: PhysicalLocation.localDevice,
  );

  const testTierBinding = UserTierBinding(
    tier: UserTier.free,
    mediaPolicyId: 'HOOK_POLICY',
  );

  const testDecision = MediaEnforcementDecision(
    uploadAllowed: false,
    localOnly: true,
    cloudAllowed: false,
    compressionRequired: true,
    coldArchiveAllowed: false,
    multiDeviceSyncAllowed: false,
    maxFileSizeBytes: 10000000,
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

  group('NoOpObservabilityHook', () {
    test('does not throw on event', () {
      const hook = NoOpObservabilityHook();
      final event = createEvent('noop-1', ObservabilityEventType.executionStarted, 0);

      expect(() => hook.onEvent(event), returnsNormally);
    });
  });

  group('CollectingObservabilityHook', () {
    test('collects events in order', () {
      final hook = CollectingObservabilityHook();

      hook.onEvent(createEvent('c-1', ObservabilityEventType.executionStarted, 0));
      hook.onEvent(createEvent('c-2', ObservabilityEventType.operationStarted, 1));
      hook.onEvent(createEvent('c-3', ObservabilityEventType.operationCompleted, 2));

      expect(hook.events.length, 3);
      expect(hook.events[0].eventId, 'c-1');
      expect(hook.events[1].eventId, 'c-2');
      expect(hook.events[2].eventId, 'c-3');
    });

    test('clear removes all events', () {
      final hook = CollectingObservabilityHook();

      hook.onEvent(createEvent('clr-1', ObservabilityEventType.executionStarted, 0));
      hook.onEvent(createEvent('clr-2', ObservabilityEventType.executionCompleted, 1));

      expect(hook.events.length, 2);

      hook.clear();

      expect(hook.events.isEmpty, isTrue);
    });
  });

  group('CompositeObservabilityHook', () {
    test('delegates to all hooks', () {
      final hook1 = CollectingObservabilityHook();
      final hook2 = CollectingObservabilityHook();
      final composite = CompositeObservabilityHook([hook1, hook2]);

      final event = createEvent('comp-1', ObservabilityEventType.lifecycleTransition, 0);
      composite.onEvent(event);

      expect(hook1.events.length, 1);
      expect(hook2.events.length, 1);
      expect(hook1.events[0], equals(hook2.events[0]));
    });

    test('works with empty list', () {
      final composite = CompositeObservabilityHook([]);
      final event = createEvent('comp-empty', ObservabilityEventType.executionStarted, 0);

      expect(() => composite.onEvent(event), returnsNormally);
    });
  });

  group('FilteringObservabilityHook', () {
    test('filters events by predicate', () {
      final inner = CollectingObservabilityHook();
      final filtering = FilteringObservabilityHook(
        delegate: inner,
        filter: (event) => event.eventType == ObservabilityEventType.operationFailed,
      );

      filtering.onEvent(createEvent('f-1', ObservabilityEventType.operationStarted, 0));
      filtering.onEvent(createEvent('f-2', ObservabilityEventType.operationFailed, 1));
      filtering.onEvent(createEvent('f-3', ObservabilityEventType.operationCompleted, 2));

      expect(inner.events.length, 1);
      expect(inner.events[0].eventId, 'f-2');
    });

    test('passes all events when predicate always true', () {
      final inner = CollectingObservabilityHook();
      final filtering = FilteringObservabilityHook(delegate: inner, filter: (_) => true);

      filtering.onEvent(createEvent('all-1', ObservabilityEventType.executionStarted, 0));
      filtering.onEvent(createEvent('all-2', ObservabilityEventType.executionCompleted, 1));

      expect(inner.events.length, 2);
    });

    test('blocks all events when predicate always false', () {
      final inner = CollectingObservabilityHook();
      final filtering = FilteringObservabilityHook(delegate: inner, filter: (_) => false);

      filtering.onEvent(createEvent('none-1', ObservabilityEventType.executionStarted, 0));
      filtering.onEvent(createEvent('none-2', ObservabilityEventType.executionCompleted, 1));

      expect(inner.events.isEmpty, isTrue);
    });
  });

  group('Hook Integration', () {
    test('composite with filtering works correctly', () {
      final allEvents = CollectingObservabilityHook();
      final failuresOnly = CollectingObservabilityHook();

      final filtering = FilteringObservabilityHook(
        delegate: failuresOnly,
        filter: (event) => event.isFailure,
      );

      final composite = CompositeObservabilityHook([allEvents, filtering]);

      composite.onEvent(createEvent('int-1', ObservabilityEventType.operationStarted, 0));
      composite.onEvent(ObservabilityEvent(
        eventId: 'int-2',
        eventType: ObservabilityEventType.operationFailed,
        mediaRef: testMediaRef,
        tierBinding: testTierBinding,
        decision: testDecision,
        logicalStep: 1,
        failure: FailureResult.networkError('Test failure'),
      ));
      composite.onEvent(createEvent('int-3', ObservabilityEventType.operationCompleted, 2));

      expect(allEvents.events.length, 3);
      expect(failuresOnly.events.length, 1);
      expect(failuresOnly.events[0].eventId, 'int-2');
    });

    test('events maintain order across hooks', () {
      final hook1 = CollectingObservabilityHook();
      final hook2 = CollectingObservabilityHook();
      final composite = CompositeObservabilityHook([hook1, hook2]);

      for (int i = 0; i < 5; i++) {
        composite.onEvent(createEvent('ord-$i', ObservabilityEventType.operationStarted, i));
      }

      for (int i = 0; i < 5; i++) {
        expect(hook1.events[i].eventId, 'ord-$i');
        expect(hook2.events[i].eventId, 'ord-$i');
        expect(hook1.events[i].logicalStep, i);
      }
    });
  });
}
