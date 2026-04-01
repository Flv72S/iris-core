// L7 — Result of idempotency check. Immutable; no logic.

/// Result of checking whether an execution was already performed.
class IdempotencyResult {
  const IdempotencyResult({
    required this.alreadyExecuted,
  });

  final bool alreadyExecuted;
}
