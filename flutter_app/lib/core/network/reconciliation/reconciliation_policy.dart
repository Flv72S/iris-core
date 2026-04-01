/// O7 — Base reconciliation policy. Controls what the engine is allowed to do.

/// Policy for the base reconciliation engine. Fork resolution is deferred.
class ReconciliationPolicy {
  const ReconciliationPolicy({
    this.allowRemoteReplay = true,
    this.allowLocalSend = true,
    this.allowForkHandling = false,
  });

  /// Allow requesting and applying remote ledger segment (replay-before-merge).
  final bool allowRemoteReplay;

  /// Allow sending local segment to remote when local is ahead.
  final bool allowLocalSend;

  /// Allow automatic fork handling. O7 Base: false (deferred to O8).
  final bool allowForkHandling;

  /// O7 Base policy: remote replay and local send allowed; fork handling off.
  static const ReconciliationPolicy base = ReconciliationPolicy(
    allowRemoteReplay: true,
    allowLocalSend: true,
    allowForkHandling: false,
  );
}
