/// O9 — In-memory audit store for tests. Append-only.

import 'package:iris_flutter_app/core/network/observability/payload_hasher.dart';
import 'package:iris_flutter_app/core/network/observability/sync_audit_entry.dart';
import 'package:iris_flutter_app/core/network/observability/sync_audit_store.dart';
import 'package:iris_flutter_app/core/network/observability/sync_event.dart';

class InMemorySyncAuditStore implements SyncAuditStore {
  final List<SyncAuditEntry> _entries = [];
  final Map<String, Map<String, dynamic>> _payloads = {};

  @override
  void append(SyncEvent event) {
    if (_payloads.containsKey(event.id)) {
      throw StateError('Duplicate event id: ${event.id}');
    }
    final payloadHash = PayloadHasher.hashPayload(event.payload);
    final entry = SyncAuditEntry(
      eventId: event.id,
      eventType: event.type,
      correlationId: event.correlationId,
      payloadHash: payloadHash,
      createdAt: event.createdAt,
    );
    _entries.add(entry);
    _payloads[event.id] = Map<String, dynamic>.from(event.payload);
  }

  @override
  List<SyncAuditEntry> getByCorrelationId(String correlationId) {
    return _entries.where((e) => e.correlationId == correlationId).toList();
  }

  @override
  List<SyncAuditEntry> getAll() => List.from(_entries);

  @override
  Map<String, dynamic>? getPayload(String eventId) {
    final p = _payloads[eventId];
    return p == null ? null : Map<String, dynamic>.from(p);
  }
}
