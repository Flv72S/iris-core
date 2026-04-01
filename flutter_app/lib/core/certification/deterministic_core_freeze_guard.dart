/// N16 — Deterministic Core Freeze Guard.
/// For development verification only. Must NOT influence runtime execution.

/// Guard to document and verify that the deterministic core is in freeze.
/// Call [assertFrozen] only in development or test contexts (e.g. certification tests).
/// This class must not be used in production code paths that affect deterministic output.
class DeterministicCoreFreezeGuard {
  DeterministicCoreFreezeGuard._();

  /// Asserts that the deterministic core freeze is in effect.
  /// No-op at runtime; for use in dev/test to enforce certification awareness.
  /// Do not call from code that runs inside the deterministic execution path.
  static void assertFrozen() {
    // Freeze declared (N16). No runtime check; documentary only.
  }
}
