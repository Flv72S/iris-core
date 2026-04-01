/// O9 — Structured metrics. Does not influence core logic.

/// Collects sync-related metrics. Read-only for core; observability only.
class SyncMetricsCollector {
  final Map<String, int> _counters = {};

  /// Increment [metricName] by 1.
  void increment(String metricName) {
    _counters[metricName] = (_counters[metricName] ?? 0) + 1;
  }

  /// Current snapshot of all metrics. Keys: metric names, values: counts.
  Map<String, int> getMetrics() => Map.from(_counters);

  /// Reset all counters to zero.
  void reset() {
    _counters.clear();
  }
}
