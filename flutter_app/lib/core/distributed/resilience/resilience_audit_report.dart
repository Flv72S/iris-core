// ODA-9 — Deterministic resilience audit. Replay-identical.

class ResilienceAuditReport {
  const ResilienceAuditReport({
    required this.activeIncidents,
    required this.historicalIncidents,
    required this.containmentStatus,
    required this.recoveryStatus,
    required this.incidentProofReferences,
    required this.resilienceHash,
    required this.divergenceFlags,
  });
  final List<String> activeIncidents;
  final List<String> historicalIncidents;
  final Map<String, String> containmentStatus;
  final Map<String, String> recoveryStatus;
  final List<String> incidentProofReferences;
  final String resilienceHash;
  final Map<String, bool> divergenceFlags;
}

class ResilienceAuditReportGenerator {
  ResilienceAuditReportGenerator._();

  static ResilienceAuditReport generateResilienceAudit({
    required List<String> activeIncidents,
    required List<String> historicalIncidents,
    required Map<String, String> containmentStatus,
    required Map<String, String> recoveryStatus,
    required List<String> incidentProofReferences,
    required String resilienceHash,
    Map<String, bool> divergenceFlags = const {},
  }) {
    return ResilienceAuditReport(
      activeIncidents: activeIncidents,
      historicalIncidents: historicalIncidents,
      containmentStatus: containmentStatus,
      recoveryStatus: recoveryStatus,
      incidentProofReferences: incidentProofReferences,
      resilienceHash: resilienceHash,
      divergenceFlags: divergenceFlags,
    );
  }
}
