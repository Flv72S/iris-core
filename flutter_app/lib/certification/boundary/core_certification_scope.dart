// Phase 14.1 — Certification boundary definition. Descriptive only; no Core mutation.

/// Immutable definition of what is inside and outside the IRIS Core certification perimeter.
/// Purely declarative; no runtime logic. Derived from Phase 13 artifacts only.
final class CoreCertificationScope {
  const CoreCertificationScope({
    required this.certifiedArtifacts,
    required this.excludedComponents,
    required this.verificationSurface,
  });

  /// Phase 13–derived artifacts that define the frozen Core. Fixed order; declarative.
  final List<String> certifiedArtifacts;

  /// Components explicitly outside the certified Core. Technical descriptions only.
  final List<String> excludedComponents;

  /// Capabilities an auditor can verify offline. Mathematically verifiable only.
  final List<String> verificationSurface;
}

/// Phase 13 artifact identifiers. Fixed order; documented.
const List<String> _certifiedArtifacts = [
  'structural hash snapshot',
  'freeze artifact',
  'immutable stamp',
  'cryptographic freeze seal',
  'audit chain root',
  'reproducible build fingerprint',
  'binary provenance',
  'external audit bundle',
  'core certification snapshot',
];

/// Components outside the Core perimeter. Technical only.
const List<String> _excludedComponents = [
  'UI layer',
  'network services',
  'external integrations',
  'runtime configuration',
  'logging infrastructure',
];

/// Offline-verifiable capabilities. Factual only.
const List<String> _verificationSurface = [
  'structural hash recomputation',
  'freeze seal validation',
  'audit chain integrity',
  'reproducible build match',
  'bundle hash comparison',
];

/// Canonical scope instance. Immutable; no runtime dependency on Core.
const CoreCertificationScope coreCertificationScope = CoreCertificationScope(
  certifiedArtifacts: _certifiedArtifacts,
  excludedComponents: _excludedComponents,
  verificationSurface: _verificationSurface,
);
