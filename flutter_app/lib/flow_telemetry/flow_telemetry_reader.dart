// F7 — Passive telemetry reader. Read and filter only; no state change.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

import 'flow_event.dart';
import 'flow_event_type.dart';
import 'flow_telemetry_snapshot.dart';

/// Read-only access to telemetry. Filters return new lists; no mutation of snapshot or events.
class FlowTelemetryReader {
  const FlowTelemetryReader(this.snapshot);

  final FlowTelemetrySnapshot snapshot;

  /// All events in order.
  List<FlowEvent> get events => List.unmodifiable(snapshot.events);

  /// Events of the given type only. New list.
  List<FlowEvent> byType(FlowEventType type) =>
      List.unmodifiable(snapshot.events.where((e) => e.eventType == type));

  /// Events that have the given step (stepId match). New list.
  List<FlowEvent> byStep(FlowStepId stepId) =>
      List.unmodifiable(snapshot.events.where((e) => e.stepId == stepId));
}
