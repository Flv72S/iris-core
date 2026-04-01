// F7 — Isolation: recorder/reader do not alter flow or events; forbidden dependency scan.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_recorder.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_telemetry_reader.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_telemetry_snapshot.dart';

void main() {
  group('Isolation guarantee', () {
    test('recorder does not mutate input: record returns new recorder', () {
      const sessionId = FlowSessionId('iso');
      final clock = TestClock(const FlowTimestamp(0));
      final r0 = FlowEventRecorder(clock: clock);
      final r1 = r0.record(FlowEventType.flowStarted, sessionId);

      expect(r0.events.length, 0);
      expect(r1.events.length, 1);
      expect(identical(r0, r1), false);
    });

    test('reader returns new lists and does not modify snapshot events', () {
      const sessionId = FlowSessionId('reader-iso');
      final clock = TestClock(const FlowTimestamp(0));
      final recorder = FlowEventRecorder(clock: clock)
          .record(FlowEventType.flowStarted, sessionId)
          .record(FlowEventType.stepEntered, sessionId)
          .record(FlowEventType.stepCompleted, sessionId);
      final snapshot = recorder.snapshot(sessionId);
      final reader = FlowTelemetryReader(snapshot);

      final byType = reader.byType(FlowEventType.stepEntered);
      expect(byType.length, 1);
      expect(byType, isNot(same(snapshot.events)));
      expect(snapshot.events.length, 3);
    });

    test('snapshot content is unmodifiable view', () {
      const sessionId = FlowSessionId('snap');
      final snapshot = FlowTelemetrySnapshot(
        sessionId: sessionId,
        events: [
          FlowEvent(
            eventId: 'e0',
            eventType: FlowEventType.flowStarted,
            sessionId: sessionId,
            sequenceIndex: 0,
            timestamp: const FlowTimestamp(0),
          ),
        ],
      );
      expect(() => snapshot.events.clear(), throwsUnsupportedError);
    });
  });

  group('Forbidden dependency scan', () {
    test('lib/flow_telemetry has no DateTime.now, Random, Timer, IO, network, core', () {
      final telemetryDir = Directory('lib/flow_telemetry');
      if (!telemetryDir.existsSync()) {
        fail('lib/flow_telemetry not found');
      }
      const forbidden = [
        'DateTime.now',
        'Random(',
        'Timer.',
        'dart:io',
        'dart:async',
        'Socket',
        'HttpClient',
        'core_consumption',
        'package:iris_flutter_app/core',
      ];
      final issues = <String>[];
      for (final f in telemetryDir.listSync()) {
        if (f is! File || !f.path.endsWith('.dart')) continue;
        final content = f.readAsStringSync();
        final name = f.uri.pathSegments.last;
        for (final token in forbidden) {
          if (content.contains(token)) {
            issues.add('$name: forbidden token "$token"');
          }
        }
      }
      expect(issues, isEmpty);
    });
  });
}
