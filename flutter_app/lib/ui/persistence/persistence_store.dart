// Phase 11.5.1 — Abstract append-only store. No update in place, no selective delete.

import 'persistence_record.dart';

/// Append-only persistence. Idempotent on same hash; rejects same ID with different content.
abstract class PersistenceStore {
  /// Appends record. Idempotent if same recordId and same contentHash; throws if same recordId, different content.
  Future<void> append(PersistenceRecord record);

  /// Loads all records in order. No filtering.
  Future<List<PersistenceRecord>> loadAll();

  /// Clears all persisted data. For tests only.
  Future<void> clearAll();
}

class PersistenceException implements Exception {
  PersistenceException(this.message);
  final String message;
  @override
  String toString() => 'PersistenceException: $message';
}
