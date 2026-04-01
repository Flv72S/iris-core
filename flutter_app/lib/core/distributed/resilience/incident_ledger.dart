// ODA-9 — Incident state transitions. Reconstructable via replay.

class IncidentRecord {
  const IncidentRecord({
    required this.incidentId,
    required this.relatedEntityIds,
    required this.classification,
    required this.containmentStatus,
    required this.recoveryStatus,
    required this.incidentHash,
  });
  final String incidentId;
  final List<String> relatedEntityIds;
  final String classification;
  final String containmentStatus;
  final String recoveryStatus;
  final String incidentHash;
}

class IncidentLedger {
  IncidentLedger();

  final List<IncidentRecord> _records = [];

  List<IncidentRecord> get records => List.unmodifiable(_records);

  void appendIncidentRecord(IncidentRecord record) {
    _records.add(record);
  }

  IncidentRecord? getIncidentState(String incidentId) {
    final matches = _records.where((r) => r.incidentId == incidentId).toList();
    return matches.isEmpty ? null : matches.last;
  }
}
