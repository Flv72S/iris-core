// Phase 14.7 — Public trust disclosure. Immutable; derived from manifest and package only.

/// Immutable freeze seal reference. Hash only; no runtime logic.
class FreezeSeal {
  const FreezeSeal({required this.hash});
  final String hash;
}

/// Immutable build fingerprint reference. Value only; no runtime logic.
class BuildFingerprint {
  const BuildFingerprint({required this.value});
  final String value;
}

/// Public trust disclosure. All values from certification manifest and verification package.
class PublicTrustDisclosure {
  const PublicTrustDisclosure({
    required this.irisCoreVersion,
    required this.structuralHash,
    required this.freezeSealHash,
    required this.buildFingerprint,
    required this.publishedEvidenceFiles,
    required this.verificationSteps,
    required this.declaredLimitations,
  });

  final String irisCoreVersion;
  final String structuralHash;
  final String freezeSealHash;
  final String buildFingerprint;
  final List<String> publishedEvidenceFiles;
  final List<String> verificationSteps;
  final List<String> declaredLimitations;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PublicTrustDisclosure &&
          irisCoreVersion == other.irisCoreVersion &&
          structuralHash == other.structuralHash &&
          freezeSealHash == other.freezeSealHash &&
          buildFingerprint == other.buildFingerprint &&
          _listEquals(publishedEvidenceFiles, other.publishedEvidenceFiles) &&
          _listEquals(verificationSteps, other.verificationSteps) &&
          _listEquals(declaredLimitations, other.declaredLimitations);

  @override
  int get hashCode =>
      Object.hash(
          irisCoreVersion,
          structuralHash,
          freezeSealHash,
          buildFingerprint,
          Object.hashAll(publishedEvidenceFiles),
          Object.hashAll(verificationSteps),
          Object.hashAll(declaredLimitations));

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
