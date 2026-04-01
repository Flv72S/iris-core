/// O11 — Measure deterministic performance without influencing logic. Optional; never affects output.

/// Profiler for replay, snapshot, fork, reconciliation, compaction duration. Disable-able; never blocks.
class PerformanceProfiler {
  final Map<String, int> _elapsedMs = {};
  final Map<String, int> _startMs = {};

  /// Start timing for [label]. No effect on execution.
  void start(String label) {
    _startMs[label] = DateTime.now().millisecondsSinceEpoch;
  }

  /// End timing for [label]; add elapsed ms to metrics.
  void end(String label) {
    final start = _startMs[label];
    if (start == null) return;
    final elapsed = DateTime.now().millisecondsSinceEpoch - start;
    _elapsedMs[label] = (_elapsedMs[label] ?? 0) + elapsed;
    _startMs.remove(label);
  }

  /// Current metrics: label -> total elapsed ms.
  Map<String, int> getMetrics() => Map.from(_elapsedMs);

  /// Clear all metrics.
  void reset() {
    _elapsedMs.clear();
    _startMs.clear();
  }
}
