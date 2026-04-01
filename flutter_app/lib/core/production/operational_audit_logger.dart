// OX9 — Append-only audit. Deterministic for same event stream.

class AuditEntry {
  const AuditEntry({
    required this.category,
    required this.eventId,
    required this.payload,
  });
  final String category;
  final String eventId;
  final Map<String, dynamic> payload;
}

void _auditNoOp(AuditEntry entry) {}

class OperationalAuditLogger {
  OperationalAuditLogger({void Function(AuditEntry entry)? sink})
      : _sink = sink ?? _auditNoOp;

  final void Function(AuditEntry entry) _sink;
  final List<AuditEntry> _entries = [];

  void logIdentityOp(String eventId, Map<String, dynamic> payload) {
    _append('identity', eventId, payload);
  }

  void logSignatureValidationFailure(String eventId, Map<String, dynamic> payload) {
    _append('signature_failure', eventId, payload);
  }

  void logForkEvent(String eventId, Map<String, dynamic> payload) {
    _append('fork', eventId, payload);
  }

  void logConflictResolution(String eventId, Map<String, dynamic> payload) {
    _append('conflict_resolution', eventId, payload);
  }

  void logAISuggestionConfirmation(String eventId, Map<String, dynamic> payload) {
    _append('ai_suggestion', eventId, payload);
  }

  void logPermissionDenial(String eventId, Map<String, dynamic> payload) {
    _append('permission_denial', eventId, payload);
  }

  void _append(String category, String eventId, Map<String, dynamic> payload) {
    final entry = AuditEntry(
      category: category,
      eventId: eventId,
      payload: Map.from(payload),
    );
    _entries.add(entry);
    _sink(entry);
  }

  List<AuditEntry> exportForCompliance() => List.unmodifiable(_entries);
}
