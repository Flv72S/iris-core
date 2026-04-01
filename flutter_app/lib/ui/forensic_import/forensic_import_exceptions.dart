// Phase 11.6.2 — Deterministic, audit-friendly import errors. Fail-fast; no silent recovery.

/// Thrown when bundle bytes are not valid UTF-8 or JSON, or required schema fields are missing.
class InvalidBundleFormatException implements Exception {
  InvalidBundleFormatException(this.message);
  final String message;
  @override
  String toString() => 'InvalidBundleFormatException: $message';
}

/// Thrown when computed content hash does not match bundle.bundleHash.
class HashMismatchException implements Exception {
  HashMismatchException(this.message);
  final String message;
  @override
  String toString() => 'HashMismatchException: $message';
}

/// Thrown when one or more records fail validation (e.g. trace invalid, unknown recordType).
class InvalidRecordException implements Exception {
  InvalidRecordException(this.message);
  final String message;
  @override
  String toString() => 'InvalidRecordException: $message';
}

/// Thrown when replayed state does not match bundle metadata (sessionId, exportedAtLogicalTime).
class ReplayMismatchException implements Exception {
  ReplayMismatchException(this.message);
  final String message;
  @override
  String toString() => 'ReplayMismatchException: $message';
}

