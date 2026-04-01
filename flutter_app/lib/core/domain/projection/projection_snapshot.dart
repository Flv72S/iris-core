/// OX2 — Deterministic projection snapshot. Read-only; tied to ledger height and version.

/// Snapshot metadata for a projection. Invalid if ledger height or version changes.
class ProjectionSnapshot {
  const ProjectionSnapshot({
    required this.projectionId,
    required this.stateHash,
    required this.ledgerHeight,
    required this.version,
  });

  final String projectionId;
  final int stateHash;
  final int ledgerHeight;
  final int version;
}
