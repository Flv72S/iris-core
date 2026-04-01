// F7 — Flow event types. Closed enum; technical only; no normative events.

/// Closed set of technical flow events. No legal, compliance, or evaluation events.
enum FlowEventType {
  flowStarted,
  stepEntered,
  stepCompleted,
  navigationAttempted,
  navigationBlocked,
  policyViolation,
  flowPaused,
  flowResumed,
  flowCompleted,
}
