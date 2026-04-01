// OX8 — Read-only context for AI. Snapshot from projection layer only; canonicalized.

/// Deterministic context snapshot for AI. Built only from projection state; no ledger/network.
class DeterministicContext {
  const DeterministicContext({
    required this.snapshot,
    required this.inputHash,
  });

  /// Canonical map (e.g. projectionId -> state canonical map). Sorted keys.
  final Map<String, dynamic> snapshot;
  /// Hash of [snapshot]; same snapshot → same hash across nodes.
  final String inputHash;
}
