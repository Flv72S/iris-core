// Phase 14.2 — Certification evidence index. Descriptive only; no Core mutation.
// Deterministic index of all evidence from Phase 13 and 14.1. No runtime logic.

/// Single entry in the certification evidence index.
/// All fields final; const constructor; no runtime logic.
class EvidenceEntry {
  const EvidenceEntry({
    required this.id,
    required this.description,
    required this.sha256,
    required this.sourcePhase,
  });

  final String id;
  final String description;
  final String sha256;
  final String sourcePhase;
}

/// Immutable index of certification evidence. Purely descriptive.
class CertificationEvidenceIndex {
  const CertificationEvidenceIndex({
    required this.entries,
  });

  final List<EvidenceEntry> entries;
}

// Phase 13 structural hash (from core_structural_hash / formal_core_snapshot).
const String _structuralHash =
    '7df6eba3c96039113db3fb609e2524b4ccd14fec5b29937bad66618de1fe1fff';

// Phase 14.1 scope serialization SHA-256 (precomputed from serializeCoreCertificationScope).
const String _scopeSerializationHash =
    '4baa69ee2787ed2d5d44450eba0b09687b6503010058c0af8eace4f034fd315f';

// Placeholder 64-char hex for Phase 13 evidences not stored as constants (deterministic).
const String _placeholder1 =
    '0000000000000000000000000000000000000000000000000000000000000001';
const String _placeholder2 =
    '0000000000000000000000000000000000000000000000000000000000000002';
const String _placeholder3 =
    '0000000000000000000000000000000000000000000000000000000000000003';
const String _placeholder4 =
    '0000000000000000000000000000000000000000000000000000000000000004';
const String _placeholder5 =
    '0000000000000000000000000000000000000000000000000000000000000005';
const String _placeholder6 =
    '0000000000000000000000000000000000000000000000000000000000000006';
const String _placeholder7 =
    '0000000000000000000000000000000000000000000000000000000000000007';
const String _placeholder8 =
    '0000000000000000000000000000000000000000000000000000000000000008';

/// Canonical evidence index. Fixed order: Phase 13 (1–9) then Phase 14.1 (10).
const CertificationEvidenceIndex certificationEvidenceIndex =
    CertificationEvidenceIndex(
  entries: [
    EvidenceEntry(
      id: 'structural_hash_snapshot',
      description: 'SHA-256 of canonical core structure snapshot',
      sha256: _structuralHash,
      sourcePhase: '13.1',
    ),
    EvidenceEntry(
      id: 'freeze_artifact',
      description: 'Hash of freeze artifact canonical JSON',
      sha256: _placeholder1,
      sourcePhase: '13.2',
    ),
    EvidenceEntry(
      id: 'immutable_stamp',
      description: 'Hash of immutable stamp payload',
      sha256: _placeholder2,
      sourcePhase: '13.3',
    ),
    EvidenceEntry(
      id: 'cryptographic_freeze_seal',
      description: 'Hash of cryptographic freeze seal',
      sha256: _placeholder3,
      sourcePhase: '13.4',
    ),
    EvidenceEntry(
      id: 'audit_chain_root',
      description: 'Root hash of audit chain',
      sha256: _placeholder4,
      sourcePhase: '13.5',
    ),
    EvidenceEntry(
      id: 'reproducible_build_fingerprint',
      description: 'SHA-256 of reproducible build fingerprint payload',
      sha256: _placeholder5,
      sourcePhase: '13.6',
    ),
    EvidenceEntry(
      id: 'binary_provenance',
      description: 'Hash of binary provenance record',
      sha256: _placeholder6,
      sourcePhase: '13.7',
    ),
    EvidenceEntry(
      id: 'external_audit_bundle',
      description: 'Hash of external audit bundle',
      sha256: _placeholder7,
      sourcePhase: '13.8',
    ),
    EvidenceEntry(
      id: 'core_certification_snapshot',
      description: 'Hash of core certification snapshot',
      sha256: _placeholder8,
      sourcePhase: '13.9',
    ),
    EvidenceEntry(
      id: 'core_certification_scope_serialization_hash',
      description: 'SHA-256 of canonical core certification scope JSON',
      sha256: _scopeSerializationHash,
      sourcePhase: '14.1',
    ),
  ],
);
