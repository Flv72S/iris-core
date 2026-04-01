/// O5 — Basic Divergence Detection. Detection-only; no resolution, no mutation.

/// Classification of divergence between local and remote state.
enum DivergenceType {
  /// Same snapshot hash and same ledger height.
  inSync,

  /// Same snapshot hash; remote ledger height > local.
  remoteAhead,

  /// Same snapshot hash; local ledger height > remote.
  localAhead,

  /// Same snapshot ancestor but different hash chain after that point.
  forkDetected,

  /// Different snapshot hash and no common ancestor found.
  snapshotMismatch,

  /// Protocol version mismatch (e.g. major differs).
  protocolIncompatible,

  /// Fallback when classification cannot be determined.
  unknown,
}
