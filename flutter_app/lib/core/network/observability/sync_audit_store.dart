/// O9 — Append-only audit storage. No overwrite, no mutation, no deletion.

import 'package:iris_flutter_app/core/network/observability/sync_audit_entry.dart';
import 'package:iris_flutter_app/core/network/observability/sync_event.dart';

/// Persists sync audit entries and full payloads. Append-only; fail-fast on corruption.
abstract class SyncAuditStore {
  /// Append [event]. Throws if [event.id] already exists (no overwrite).
  void append(SyncEvent event);

  /// All entries with [correlationId], in append order.
  List<SyncAuditEntry> getByCorrelationId(String correlationId);

  /// All entries in append order.
  List<SyncAuditEntry> getAll();

  /// Full payload for [eventId]. Returns null if not found.
  Map<String, dynamic>? getPayload(String eventId);
}
