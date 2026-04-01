// Phase 14.8 — External audit reproducibility proof. Immutable; deterministic.

/// Result of structural hash recomputation. Value only.
class StructuralHashResult {
  const StructuralHashResult({required this.value});
  final String value;
}

/// Snapshot of auditor environment. Deterministic; no real env access.
class AuditorEnvironmentSnapshot {
  const AuditorEnvironmentSnapshot({
    required this.mode,
    required this.components,
  });
  final String mode;
  final List<String> components;
}

/// External audit reproducibility proof. All fields from deterministic inputs.
class ExternalAuditReproducibilityProof {
  const ExternalAuditReproducibilityProof({
    required this.irisCoreVersion,
    required this.structuralHash,
    required this.freezeSealHash,
    required this.buildFingerprint,
    required this.reproducedAtUtc,
    required this.auditorEnvironmentHash,
    required this.hashesMatch,
  });

  final String irisCoreVersion;
  final String structuralHash;
  final String freezeSealHash;
  final String buildFingerprint;
  /// ISO8601 UTC string. Deterministic; no system clock.
  final String reproducedAtUtc;
  final String auditorEnvironmentHash;
  final bool hashesMatch;
}
