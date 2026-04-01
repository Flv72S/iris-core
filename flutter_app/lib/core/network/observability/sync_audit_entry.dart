/// O9 — Durable audit record. Append-only; no update or deletion.

import 'package:iris_flutter_app/core/network/observability/sync_event.dart';

/// Immutable audit entry. Full payload stored separately in store.
class SyncAuditEntry {
  const SyncAuditEntry({
    required this.eventId,
    required this.eventType,
    required this.correlationId,
    required this.payloadHash,
    required this.createdAt,
  });

  final String eventId;
  final SyncEventType eventType;
  final String correlationId;

  /// Deterministic hash (e.g. SHA-256 hex) of serialized payload.
  final String payloadHash;

  /// Informational only.
  final String createdAt;
}
