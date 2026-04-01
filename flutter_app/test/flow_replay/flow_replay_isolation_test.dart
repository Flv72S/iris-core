// F8 — Replay does not alter events or runtime; no Core access; forbidden logic scan.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_telemetry_snapshot.dart';
import 'package:iris_flutter_app/flow_replay/flow_replay_engine.dart';

void main() {
  group('Isolation guarantee', () {
    test('replay does not alter events: fromSnapshot returns new state, snapshot unchanged', () {
      const sessionId = FlowSessionId('iso');
      final events = [
        FlowEvent(
          eventId: 'x0',
          eventType: FlowEventType.flowStarted,
          sessionId: sessionId,
          sequenceIndex: 0,
          timestamp: const FlowTimestamp(0),
        ),
      ];
      final snapshot = FlowTelemetrySnapshot(sessionId: sessionId, events: events);
      final state = FlowReplayEngine.fromSnapshot(snapshot);

      expect(snapshot.events.length, 1);
      expect(snapshot.events[0].eventId, 'x0');
      expect(state.steps.length, 1);
      expect(state.steps[0].event.eventId, 'x0');
      expect(identical(state.steps[0].event, snapshot.events[0]), true);
    });

    test('advance does not mutate state: returns new state', () {
      const sessionId = FlowSessionId('adv');
      final snapshot = FlowTelemetrySnapshot(
        sessionId: sessionId,
        events: [
          FlowEvent(
            eventId: 'a',
            eventType: FlowEventType.flowStarted,
            sessionId: sessionId,
            sequenceIndex: 0,
            timestamp: const FlowTimestamp(0),
          ),
          FlowEvent(
            eventId: 'b',
            eventType: FlowEventType.flowCompleted,
            sessionId: sessionId,
            sequenceIndex: 1,
            timestamp: const FlowTimestamp(1),
          ),
        ],
      );
      final state0 = FlowReplayEngine.fromSnapshot(snapshot);
      final state1 = FlowReplayEngine.advance(state0);

      expect(state1, isNotNull);
      expect(state0.cursor.eventIndex, 0);
      expect(state1!.cursor.eventIndex, 1);
      expect(identical(state0, state1), false);
    });

    test('buildDebugSnapshot does not mutate replay state', () {
      const sessionId = FlowSessionId('dbg');
      final snapshot = FlowTelemetrySnapshot(
        sessionId: sessionId,
        events: [
          FlowEvent(
            eventId: 'd0',
            eventType: FlowEventType.flowStarted,
            sessionId: sessionId,
            sequenceIndex: 0,
            timestamp: const FlowTimestamp(0),
          ),
        ],
      );
      final state = FlowReplayEngine.fromSnapshot(snapshot);
      final debug = FlowReplayEngine.buildDebugSnapshot(state);

      expect(debug.replayState, state);
      expect(debug.eventsApplied.length, 1);
    });
  });

  group('Forbidden logic scan', () {
    test('lib/flow_replay has no validat, verify, certify, evaluate, DateTime.now, IO, network', () {
      final replayDir = Directory('lib/flow_replay');
      if (!replayDir.existsSync()) {
        fail('lib/flow_replay not found');
      }
      const forbidden = [
        'validat',
        'verify',
        'certify',
        'evaluate',
        'DateTime.now',
        'dart:io',
        'Socket',
        'HttpClient',
        'Random(',
      ];
      final issues = <String>[];
      for (final f in replayDir.listSync()) {
        if (f is! File || !f.path.endsWith('.dart')) continue;
        final content = f.readAsStringSync();
        final name = f.uri.pathSegments.last;
        for (final token in forbidden) {
          if (content.contains(token)) {
            issues.add('$name: forbidden "$token"');
          }
        }
      }
      expect(issues, isEmpty);
    });
  });
}
