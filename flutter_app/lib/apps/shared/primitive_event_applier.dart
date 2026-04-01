// OX5 — Helper to apply PrimitiveEvent in app projections.

import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';

/// Returns eventType and payload if [event] is a [PrimitiveEvent]; otherwise null.
(Map<String, dynamic> payload, String type)? getPrimitiveEventData(DeterministicEvent event) {
  if (event is! PrimitiveEvent) return null;
  return (event.payload, event.eventType);
}
