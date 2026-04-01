// F7 — Append-only event recorder. Pure; no side effects; deterministic.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

import 'flow_event.dart';
import 'flow_event_type.dart';
import 'flow_telemetry_snapshot.dart';

/// Append-only recorder. Assigns sequenceIndex and timestamp; preserves order.
/// Immutable: record() returns a new recorder.
class FlowEventRecorder {
  FlowEventRecorder({
    FlowClock? clock,
    List<FlowEvent>? initialEvents,
  })  : _clock = clock ?? _noClock,
        _events = List.unmodifiable(initialEvents ?? const []);

  static final _noClock = _ThrowingClock();

  final FlowClock _clock;
  final List<FlowEvent> _events;

  /// Events recorded so far. Read-only.
  List<FlowEvent> get events => _events;

  /// Record a new event. Returns a new recorder with the event appended.
  /// Deterministic: same inputs + same clock → same event content and order.
  FlowEventRecorder record(
    FlowEventType eventType,
    FlowSessionId sessionId, {
    FlowStepId? stepId,
    Map<String, Object>? metadata,
  }) {
    final sequenceIndex = _events.length;
    final eventId = '${sessionId.value}_$sequenceIndex';
    final timestamp = _clock.now();
    final event = FlowEvent(
      eventId: eventId,
      eventType: eventType,
      sessionId: sessionId,
      stepId: stepId,
      sequenceIndex: sequenceIndex,
      timestamp: timestamp,
      metadata: metadata != null ? Map.unmodifiable(metadata) : const {},
    );
    return FlowEventRecorder(
      clock: _clock,
      initialEvents: [..._events, event],
    );
  }

  /// Build a snapshot for the given session. Use after recording.
  FlowTelemetrySnapshot snapshot(FlowSessionId sessionId) =>
      FlowTelemetrySnapshot(sessionId: sessionId, events: _events);
}

/// Throws if now() is called without injecting a clock (e.g. in tests).
class _ThrowingClock implements FlowClock {
  @override
  FlowTimestamp now() => throw StateError('FlowEventRecorder requires FlowClock');
}
