// F7 — Flow event DTO. Immutable; timestamp via FlowClock only.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

import 'flow_event_type.dart';

/// Immutable technical event. No DateTime; uses FlowTimestamp.
class FlowEvent {
  const FlowEvent({
    required this.eventId,
    required this.eventType,
    required this.sessionId,
    required this.sequenceIndex,
    required this.timestamp,
    this.stepId,
    this.metadata = const {},
  });

  final String eventId;
  final FlowEventType eventType;
  final FlowSessionId sessionId;
  final FlowStepId? stepId;
  final int sequenceIndex;
  final FlowTimestamp timestamp;
  final Map<String, Object> metadata;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowEvent &&
          eventId == other.eventId &&
          eventType == other.eventType &&
          sessionId == other.sessionId &&
          stepId == other.stepId &&
          sequenceIndex == other.sequenceIndex &&
          timestamp == other.timestamp);

  @override
  int get hashCode => Object.hash(
        eventId,
        eventType,
        sessionId,
        stepId,
        sequenceIndex,
        timestamp,
      );
}
