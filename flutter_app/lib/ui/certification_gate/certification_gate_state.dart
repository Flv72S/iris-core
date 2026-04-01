// Phase 11.8.1 — Certification gate state. Deterministic enum.

/// State of the UI certification gate. Pure; no side-effects.
enum CertificationGateState {
  /// Gate open: verified bundle and pack present; UI accessible.
  open,

  /// Gate closed: pack null or pack hash verification failed.
  closedInvalidPack,

  /// Gate closed: pack hash valid but bundle hash does not match pack reference.
  closedHashMismatch,

  /// Gate closed: no verified forensic bundle.
  closedMissingBundle,
}
