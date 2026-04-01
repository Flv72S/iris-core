// F7 — Deterministic telemetry snapshot. Read-only; for debug and replay.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

import 'flow_event.dart';

/// Immutable snapshot of events for a session. UX-safe for export and replay.
class FlowTelemetrySnapshot {
  FlowTelemetrySnapshot({
    required this.sessionId,
    required List<FlowEvent> events,
  }) : events = List.unmodifiable(events);

  final FlowSessionId sessionId;
  final List<FlowEvent> events;

  /// Deterministic content hash for equality / regression checks.
  int get contentHash => Object.hash(
        sessionId.hashCode,
        events.length,
        Object.hashAll(events.map((e) =>
            Object.hash(e.eventId, e.sequenceIndex, e.eventType, e.timestamp.epochMillis))),
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowTelemetrySnapshot &&
          sessionId == other.sessionId &&
          _listEquals(events, other.events));

  static bool _listEquals(List<FlowEvent> a, List<FlowEvent> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(sessionId, Object.hashAll(events));
}
