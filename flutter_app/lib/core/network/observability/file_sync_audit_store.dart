/// O9 — File-based audit store. Append-only; deterministic serialization; fail-fast on read.

import 'dart:convert';
import 'dart:io';

import 'package:iris_flutter_app/core/network/observability/payload_hasher.dart';
import 'package:iris_flutter_app/core/network/observability/sync_audit_entry.dart';
import 'package:iris_flutter_app/core/network/observability/sync_audit_store.dart';
import 'package:iris_flutter_app/core/network/observability/sync_event.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';

/// File format: one JSON object per line (NDJSON). Each line: { "eventId", "eventType", "correlationId", "payloadHash", "createdAt", "payload" }.
class FileSyncAuditStore implements SyncAuditStore {
  FileSyncAuditStore({required this.filePath});

  final String filePath;
  final List<SyncAuditEntry> _entries = [];
  final Map<String, Map<String, dynamic>> _payloads = {};
  bool _loaded = false;

  void _ensureLoaded() {
    if (_loaded) return;
    _loaded = true;
    final file = File(filePath);
    if (!file.existsSync()) return;
    final lines = file.readAsStringSync().split('\n');
    for (var i = 0; i < lines.length; i++) {
      final line = lines[i].trim();
      if (line.isEmpty) continue;
      try {
        final map = jsonDecode(line) as Map<String, dynamic>;
        final entry = _mapToEntry(map);
        final payload = map['payload'] as Map?;
        if (payload == null) throw FormatException('Missing payload at line ${i + 1}');
        _entries.add(entry);
        _payloads[entry.eventId] = Map<String, dynamic>.from(payload);
      } catch (e) {
        throw FormatException('Corrupted audit at line ${i + 1}: $e');
      }
    }
  }

  SyncAuditEntry _mapToEntry(Map<String, dynamic> map) {
    return SyncAuditEntry(
      eventId: map['eventId'] as String,
      eventType: SyncEventType.values.byName(map['eventType'] as String),
      correlationId: map['correlationId'] as String,
      payloadHash: map['payloadHash'] as String,
      createdAt: map['createdAt'] as String,
    );
  }

  @override
  void append(SyncEvent event) {
    _ensureLoaded();
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
    final line = _toLine(entry, event.payload);
    File(filePath).writeAsStringSync('$line\n', mode: FileMode.append);
  }

  String _toLine(SyncAuditEntry entry, Map<String, dynamic> payload) {
    final map = {
      'eventId': entry.eventId,
      'eventType': entry.eventType.name,
      'correlationId': entry.correlationId,
      'payloadHash': entry.payloadHash,
      'createdAt': entry.createdAt,
      'payload': payload,
    };
    return SyncPayloadCodec.toCanonicalJsonString(map);
  }

  @override
  List<SyncAuditEntry> getByCorrelationId(String correlationId) {
    _ensureLoaded();
    return _entries.where((e) => e.correlationId == correlationId).toList();
  }

  @override
  List<SyncAuditEntry> getAll() {
    _ensureLoaded();
    return List.from(_entries);
  }

  @override
  Map<String, dynamic>? getPayload(String eventId) {
    _ensureLoaded();
    final p = _payloads[eventId];
    return p == null ? null : Map<String, dynamic>.from(p);
  }
}
