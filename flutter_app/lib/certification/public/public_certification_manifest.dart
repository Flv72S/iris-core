// Phase 14.3 — Public certification manifest. Static descriptor; no Core mutation.
// Derived only from Phase 13, 14.1, 14.2. No runtime logic; no IO.

/// Public certification manifest. Immutable; all values from prior phases.
class PublicCertificationManifest {
  const PublicCertificationManifest({
    required this.manifestVersion,
    required this.coreStructuralHash,
    required this.certificationScopeHash,
    required this.evidenceIndexHash,
    required this.evidenceEntryIds,
    required this.generatedBy,
  });

  final String manifestVersion;
  final String coreStructuralHash;
  final String certificationScopeHash;
  final String evidenceIndexHash;
  final List<String> evidenceEntryIds;
  final String generatedBy;
}

// Phase 13.3 structural hash (core structural hash snapshot).
const String _coreStructuralHash =
    '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';

// Phase 14.1 scope serialization SHA-256.
const String _certificationScopeHash =
    '4baa69ee2787ed2d5d44450eba0b09687b6503010058c0af8eace4f034fd315f';

// Phase 14.2 evidence index SHA-256 (canonical serialization).
const String _evidenceIndexHash =
    'e5a67ea1f35e51ea749346ddf9b54d9a52697a9198a18a486eb708f81fddd57e';

/// Evidence entry ids in fixed order. No duplicates.
const List<String> _evidenceEntryIds = [
  'structural_hash_snapshot',
  'freeze_artifact',
  'immutable_stamp',
  'cryptographic_freeze_seal',
  'audit_chain_root',
  'reproducible_build_fingerprint',
  'binary_provenance',
  'external_audit_bundle',
  'core_certification_snapshot',
  'core_certification_scope_serialization_hash',
];

/// Canonical public certification manifest instance.
const PublicCertificationManifest publicCertificationManifest =
    PublicCertificationManifest(
  manifestVersion: '14.3',
  coreStructuralHash: _coreStructuralHash,
  certificationScopeHash: _certificationScopeHash,
  evidenceIndexHash: _evidenceIndexHash,
  evidenceEntryIds: _evidenceEntryIds,
  generatedBy: 'IRIS Public Certification Manifest Generator',
);
