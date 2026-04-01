// F7 — Event order stability: sequenceIndex increasing, stable order, no loss.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_recorder.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';

void main() {
  late FlowSessionId sessionId;
  late TestClock clock;
  late FlowEventRecorder recorder;

  setUp(() {
    sessionId = const FlowSessionId('s1');
    clock = TestClock(const FlowTimestamp(1000));
    recorder = FlowEventRecorder(clock: clock);
  });

  test('sequenceIndex increases 0, 1, 2 and order is stable', () {
    var r = recorder
        .record(FlowEventType.flowStarted, sessionId)
        .record(FlowEventType.stepEntered, sessionId)
        .record(FlowEventType.stepCompleted, sessionId)
        .record(FlowEventType.flowCompleted, sessionId);

    expect(r.events.length, 4);
    expect(r.events[0].sequenceIndex, 0);
    expect(r.events[1].sequenceIndex, 1);
    expect(r.events[2].sequenceIndex, 2);
    expect(r.events[3].sequenceIndex, 3);
  });

  test('no event loss and eventIds unique per index', () {
    var r = recorder
        .record(FlowEventType.navigationAttempted, sessionId)
        .record(FlowEventType.navigationBlocked, sessionId);

    expect(r.events.length, 2);
    expect(r.events[0].eventId, 's1_0');
    expect(r.events[1].eventId, 's1_1');
    expect(r.events[0].eventType, FlowEventType.navigationAttempted);
    expect(r.events[1].eventType, FlowEventType.navigationBlocked);
  });

  test('full flow sequence preserves order', () {
    var r = recorder
        .record(FlowEventType.flowStarted, sessionId)
        .record(FlowEventType.stepEntered, sessionId)
        .record(FlowEventType.stepCompleted, sessionId)
        .record(FlowEventType.flowPaused, sessionId)
        .record(FlowEventType.flowResumed, sessionId)
        .record(FlowEventType.flowCompleted, sessionId);

    expect(r.events.length, 6);
    for (var i = 0; i < r.events.length; i++) {
      expect(r.events[i].sequenceIndex, i);
    }
    expect(r.events[0].eventType, FlowEventType.flowStarted);
    expect(r.events[5].eventType, FlowEventType.flowCompleted);
  });
}
