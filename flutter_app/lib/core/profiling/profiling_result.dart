/// Pure data object for deterministic execution cost measurement.
/// Observational only; no effect on deterministic core.

class ProfilingResult {
  const ProfilingResult({
    required this.transitionCount,
    required this.totalTransitionTime,
    required this.totalSnapshotTime,
    required this.totalHashTime,
    required this.totalLedgerAppendTime,
    required this.totalReplayTime,
  });

  final int transitionCount;
  final Duration totalTransitionTime;
  final Duration totalSnapshotTime;
  final Duration totalHashTime;
  final Duration totalLedgerAppendTime;
  final Duration totalReplayTime;

  double get averageTransitionTime =>
      transitionCount > 0
          ? totalTransitionTime.inMicroseconds / transitionCount
          : 0.0;

  double get averageSnapshotTime =>
      transitionCount > 0
          ? totalSnapshotTime.inMicroseconds / transitionCount
          : 0.0;
}
