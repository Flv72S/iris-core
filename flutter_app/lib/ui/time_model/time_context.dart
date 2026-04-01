// Phase 11.4.2 — Immutable time context. Passive metadata for replay and audit.

import 'logical_time.dart';
import 'session_id.dart';

/// Immutable context: session + logical time. No system time. For decision loop, navigation, explainability.
class TimeContext {
  const TimeContext({
    required this.sessionId,
    required this.currentTime,
  });

  final SessionId sessionId;
  final LogicalTime currentTime;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TimeContext &&
          runtimeType == other.runtimeType &&
          sessionId == other.sessionId &&
          currentTime == other.currentTime;

  @override
  int get hashCode => Object.hash(sessionId, currentTime);
}
