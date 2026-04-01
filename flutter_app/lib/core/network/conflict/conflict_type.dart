/// OX1 — Deterministic conflict classification. No mutation; object diff based.

/// Conflict classification from object-level diff.
enum ConflictType {
  noConflict,
  nonOverlappingChanges,
  fieldLevelConflict,
  structuralConflict,
  objectDeletionConflict,
  incompatibleSchema,
  unknown,
}
