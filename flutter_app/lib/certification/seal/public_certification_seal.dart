// Phase 14.9 — Public certification seal. Immutable; derived from certified artifacts only.

/// Public certification seal. All values from manifest, seal, fingerprint, proof, disclosure.
class PublicCertificationSeal {
  const PublicCertificationSeal({
    required this.irisCoreVersion,
    required this.structuralHash,
    required this.freezeSealHash,
    required this.buildFingerprint,
    required this.reproducibilityProofHash,
    required this.trustDisclosureHash,
    required this.evidenceFiles,
  });

  final String irisCoreVersion;
  final String structuralHash;
  final String freezeSealHash;
  final String buildFingerprint;
  final String reproducibilityProofHash;
  final String trustDisclosureHash;
  final List<String> evidenceFiles;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PublicCertificationSeal &&
          irisCoreVersion == other.irisCoreVersion &&
          structuralHash == other.structuralHash &&
          freezeSealHash == other.freezeSealHash &&
          buildFingerprint == other.buildFingerprint &&
          reproducibilityProofHash == other.reproducibilityProofHash &&
          trustDisclosureHash == other.trustDisclosureHash &&
          _listEquals(evidenceFiles, other.evidenceFiles);

  @override
  int get hashCode => Object.hash(
        irisCoreVersion,
        structuralHash,
        freezeSealHash,
        buildFingerprint,
        reproducibilityProofHash,
        trustDisclosureHash,
        Object.hashAll(evidenceFiles),
      );

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
