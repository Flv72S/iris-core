// Media Execution — Execution status. Pure enum; no runtime logic.

/// Status of a physical operation execution.
/// Pure enum; no internal logic; no runtime reference.
enum ExecutionStatus {
  /// Operation completed successfully.
  success,

  /// Operation failed.
  failure,

  /// Operation was skipped (e.g., already completed or not applicable).
  skipped,
}
