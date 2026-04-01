// F2 — Flow temporal context: clock isolation, TestClock, elapsed UX only.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';

void main() {
  group('FlowTemporalContext', () {
    test('elapsedMillis uses FlowClock only', () {
      final clock = TestClock(const FlowTimestamp(5000));
      const ctx = FlowTemporalContext(sessionStart: FlowTimestamp(1000));
      expect(ctx.elapsedMillis(clock), equals(4000));
    });

    test('elapsedMillis returns 0 when no session start', () {
      final clock = TestClock(const FlowTimestamp(5000));
      const ctx = FlowTemporalContext();
      expect(ctx.elapsedMillis(clock), equals(0));
    });

    test('TestClock allows simulation', () {
      final clock = TestClock(const FlowTimestamp(100));
      expect(clock.now().epochMillis, equals(100));
      clock.setNow(const FlowTimestamp(200));
      expect(clock.now().epochMillis, equals(200));
    });

    test('copyWith returns new instance', () {
      const ctx = FlowTemporalContext(sessionStart: FlowTimestamp(1));
      final copy = ctx.copyWith(lastStepAt: const FlowTimestamp(2));
      expect(identical(ctx, copy), isFalse);
      expect(ctx.lastStepAt, isNull);
      expect(copy.lastStepAt?.epochMillis, equals(2));
    });

    test('equality', () {
      const a = FlowTemporalContext(
        sessionStart: FlowTimestamp(1),
        lastStepAt: FlowTimestamp(2),
      );
      const b = FlowTemporalContext(
        sessionStart: FlowTimestamp(1),
        lastStepAt: FlowTimestamp(2),
      );
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });
}
