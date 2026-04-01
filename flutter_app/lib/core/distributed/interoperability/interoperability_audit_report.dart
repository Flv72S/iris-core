// ODA-10 — Deterministic interoperability report. Replay-identical.

class InteroperabilityAuditReport {
  const InteroperabilityAuditReport({
    required this.activeExternalSystems,
    required this.activeBridgeContracts,
    required this.acceptedProofs,
    required this.rejectedProofs,
    required this.externalSettlements,
    required this.snapshotIntegrity,
    required this.interoperabilityHash,
    required this.divergenceFlags,
  });
  final List<String> activeExternalSystems;
  final List<String> activeBridgeContracts;
  final List<String> acceptedProofs;
  final List<String> rejectedProofs;
  final List<String> externalSettlements;
  final Map<String, bool> snapshotIntegrity;
  final String interoperabilityHash;
  final Map<String, bool> divergenceFlags;
}

class InteroperabilityAuditReportGenerator {
  InteroperabilityAuditReportGenerator._();

  static InteroperabilityAuditReport generateInteroperabilityAudit({
    required List<String> activeExternalSystems,
    required List<String> activeBridgeContracts,
    required List<String> acceptedProofs,
    required List<String> rejectedProofs,
    required List<String> externalSettlements,
    required Map<String, bool> snapshotIntegrity,
    required String interoperabilityHash,
    Map<String, bool> divergenceFlags = const {},
  }) {
    return InteroperabilityAuditReport(
      activeExternalSystems: activeExternalSystems,
      activeBridgeContracts: activeBridgeContracts,
      acceptedProofs: acceptedProofs,
      rejectedProofs: rejectedProofs,
      externalSettlements: externalSettlements,
      snapshotIntegrity: snapshotIntegrity,
      interoperabilityHash: interoperabilityHash,
      divergenceFlags: divergenceFlags,
    );
  }
}
