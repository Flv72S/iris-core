// Phase 11.2.4 — Immutable snapshot. Audit and replay.

import '../dto/decision_trace_dto.dart';

/// Immutable snapshot of the replay store. Lists are unmodifiable.
class ReplayStoreSnapshot {
  const ReplayStoreSnapshot({
    required this.traces,
    required this.storeHash,
  });

  final List<DecisionTraceDto> traces;
  final String storeHash;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReplayStoreSnapshot &&
          runtimeType == other.runtimeType &&
          _listEquals(traces, other.traces) &&
          storeHash == other.storeHash;

  @override
  int get hashCode => Object.hash(Object.hashAll(traces), storeHash);

  static bool _listEquals(List<DecisionTraceDto> a, List<DecisionTraceDto> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
