// F2 — Flow temporal context. UX time only; FlowClock injected; no normative logic.

import 'flow_runtime_models.dart';

/// Temporal context for UX: session duration, start, last step, elapsed. No legal/normative use.
class FlowTemporalContext {
  const FlowTemporalContext({
    this.sessionStart,
    this.lastStepAt,
  });

  final FlowTimestamp? sessionStart;
  final FlowTimestamp? lastStepAt;

  /// Elapsed milliseconds since session start. 0 if no start.
  int elapsedMillis(FlowClock clock) {
    final start = sessionStart;
    if (start == null) return 0;
    final now = clock.now();
    return (now.epochMillis - start.epochMillis).clamp(0, 0x7FFFFFFFFFFFFFFF);
  }

  FlowTemporalContext copyWith({
    FlowTimestamp? sessionStart,
    FlowTimestamp? lastStepAt,
  }) {
    return FlowTemporalContext(
      sessionStart: sessionStart ?? this.sessionStart,
      lastStepAt: lastStepAt ?? this.lastStepAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowTemporalContext &&
          sessionStart == other.sessionStart &&
          lastStepAt == other.lastStepAt);

  @override
  int get hashCode => Object.hash(sessionStart, lastStepAt);
}

/// System clock. Only implementation that reads real time; inject into runtime.
/// This is the single allowed use of system time in the flow runtime layer.
class DefaultSystemClock implements FlowClock {
  @override
  FlowTimestamp now() =>
      FlowTimestamp(DateTime.now().millisecondsSinceEpoch);
}

/// Test double: fixed time for deterministic tests.
class TestClock implements FlowClock {
  TestClock([FlowTimestamp? fixed]) : _fixed = fixed ?? const FlowTimestamp(0);
  FlowTimestamp _fixed;
  void setNow(FlowTimestamp t) => _fixed = t;
  @override
  FlowTimestamp now() => _fixed;
}
