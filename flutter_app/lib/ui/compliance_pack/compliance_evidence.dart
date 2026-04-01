// Phase 11.7.1 — Immutable evidence item. Mechanically derived only.

/// Single piece of compliance evidence. All fields derived from VerifiedForensicBundle; no interpretation.
class ComplianceEvidence {
  const ComplianceEvidence({
    this.traceId,
    this.sessionId,
    this.logicalTime,
    this.storeHash,
    this.forensicBundleHash,
    this.explanationSnapshot,
    this.navigationStackSnapshot,
  });

  final String? traceId;
  final String? sessionId;
  final String? logicalTime;
  final String? storeHash;
  final String? forensicBundleHash;
  final String? explanationSnapshot;
  final String? navigationStackSnapshot;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (traceId != null) map['traceId'] = traceId;
    if (sessionId != null) map['sessionId'] = sessionId;
    if (logicalTime != null) map['logicalTime'] = logicalTime;
    if (storeHash != null) map['storeHash'] = storeHash;
    if (forensicBundleHash != null) map['forensicBundleHash'] = forensicBundleHash;
    if (explanationSnapshot != null) map['explanationSnapshot'] = explanationSnapshot;
    if (navigationStackSnapshot != null) map['navigationStackSnapshot'] = navigationStackSnapshot;
    return map;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ComplianceEvidence &&
          runtimeType == other.runtimeType &&
          traceId == other.traceId &&
          sessionId == other.sessionId &&
          logicalTime == other.logicalTime &&
          storeHash == other.storeHash &&
          forensicBundleHash == other.forensicBundleHash &&
          explanationSnapshot == other.explanationSnapshot &&
          navigationStackSnapshot == other.navigationStackSnapshot;

  @override
  int get hashCode => Object.hash(
        traceId,
        sessionId,
        logicalTime,
        storeHash,
        forensicBundleHash,
        explanationSnapshot,
        navigationStackSnapshot,
      );
}
