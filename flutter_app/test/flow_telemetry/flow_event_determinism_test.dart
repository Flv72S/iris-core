// F7 — Deterministic telemetry: same sequence yields identical events and snapshot hash.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_recorder.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';

void main() {
  test('same sequence twice yields identical events and snapshot hash', () {
    const sessionId = FlowSessionId('det-session');
    final clock = TestClock(const FlowTimestamp(2000));

    FlowEventRecorder runSequence() {
      var r = FlowEventRecorder(clock: clock);
      return r
          .record(FlowEventType.flowStarted, sessionId)
          .record(FlowEventType.stepEntered, sessionId)
          .record(FlowEventType.stepCompleted, sessionId)
          .record(FlowEventType.flowCompleted, sessionId);
    }

    final r1 = runSequence();
    final r2 = runSequence();

    expect(r1.events.length, r2.events.length);
    for (var i = 0; i < r1.events.length; i++) {
      expect(r1.events[i].eventId, r2.events[i].eventId);
      expect(r1.events[i].sequenceIndex, r2.events[i].sequenceIndex);
      expect(r1.events[i].eventType, r2.events[i].eventType);
      expect(r1.events[i].timestamp.epochMillis, r2.events[i].timestamp.epochMillis);
    }

    final snap1 = r1.snapshot(sessionId);
    final snap2 = r2.snapshot(sessionId);
    expect(snap1.contentHash, snap2.contentHash);
  });

  test('100 runs same inputs produce same snapshot hash', () {
    const sessionId = FlowSessionId('hash-session');
    final clock = TestClock(const FlowTimestamp(0));

    final hashes = <int>[];
    for (var run = 0; run < 100; run++) {
      var r = FlowEventRecorder(clock: clock)
          .record(FlowEventType.flowStarted, sessionId)
          .record(FlowEventType.flowCompleted, sessionId);
      hashes.add(r.snapshot(sessionId).contentHash);
    }
    final first = hashes.first;
    expect(hashes.every((h) => h == first), true);
  });
}
