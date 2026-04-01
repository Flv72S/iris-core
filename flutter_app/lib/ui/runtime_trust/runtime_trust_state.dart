// Phase 11.8.2 — Immutable runtime trust state. Derived data only; no logic.

/// State for the Runtime Trust Indicator. All fields required; equality deterministic.
class RuntimeTrustState {
  const RuntimeTrustState({
    required this.isCertified,
    required this.compliancePackHash,
    required this.forensicBundleHash,
    required this.logicalTick,
    required this.sessionId,
  });

  final bool isCertified;
  final String compliancePackHash;
  final String forensicBundleHash;
  final int logicalTick;
  final String sessionId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RuntimeTrustState &&
          runtimeType == other.runtimeType &&
          isCertified == other.isCertified &&
          compliancePackHash == other.compliancePackHash &&
          forensicBundleHash == other.forensicBundleHash &&
          logicalTick == other.logicalTick &&
          sessionId == other.sessionId;

  @override
  int get hashCode =>
      Object.hash(isCertified, compliancePackHash, forensicBundleHash,
          logicalTick, sessionId);
}
