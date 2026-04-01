// J5 — Record type for integrity verification.

/// Category of persisted record for verification.
enum RecordType {
  snapshot,
  result,
  event,
  failure,
  guard,
}
