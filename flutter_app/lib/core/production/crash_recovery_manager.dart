// OX9 — Deterministic recovery after crash.

class RecoveryReport {
  const RecoveryReport({
    required this.recovered,
    required this.partialAppendDetected,
    required this.lastSignedEventValid,
    required this.rollbackCount,
    required this.rebuildOk,
    this.details = const [],
  });
  final bool recovered;
  final bool partialAppendDetected;
  final bool lastSignedEventValid;
  final int rollbackCount;
  final bool rebuildOk;
  final List<String> details;
}

abstract class CrashRecoveryProvider {
  bool get hasPartialAppend;
  bool get lastSignedEventValid;
  int rollbackIncomplete();
  bool rebuildProjectionFromSnapshot();
}

class CrashRecoveryManager {
  CrashRecoveryManager({required CrashRecoveryProvider provider})
      : _provider = provider;
  final CrashRecoveryProvider _provider;

  RecoveryReport runRecovery() {
    final partial = _provider.hasPartialAppend;
    final lastValid = _provider.lastSignedEventValid;
    int rollbackCount = 0;
    if (partial && !lastValid) rollbackCount = _provider.rollbackIncomplete();
    final rebuildOk = _provider.rebuildProjectionFromSnapshot();
    return RecoveryReport(
      recovered: rebuildOk,
      partialAppendDetected: partial,
      lastSignedEventValid: lastValid,
      rollbackCount: rollbackCount,
      rebuildOk: rebuildOk,
    );
  }
}
