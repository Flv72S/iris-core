// J5 — Integrity violation classification.

enum IntegrityViolationType {
  FILE_MISSING,
  HASH_MISMATCH_FILENAME,
  HASH_MISMATCH_CONTENT,
  HASH_MISMATCH_RECOMPUTED,
  CORRUPTED_FORMAT,
}
