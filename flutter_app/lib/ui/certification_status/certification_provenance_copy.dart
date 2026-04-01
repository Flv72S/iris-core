// Microstep 12.6 — UX-facing provenance copy. Explain the source, never the meaning.

import 'certification_capability.dart';

/// Copy che descrive l'origine tecnica di un indicatore. Solo descrittivo; nessun giudizio.
class CertificationProvenanceCopy {
  const CertificationProvenanceCopy({
    required this.capabilityCode,
    required this.explanation,
    required this.derivedFrom,
  });

  final String capabilityCode;
  final String explanation;
  final List<String> derivedFrom;
}

/// Registry statico: una entry per ogni CertificationCapability.code (ordine enum).
const Map<String, CertificationProvenanceCopy> certificationProvenanceRegistry = {
  'deterministic_replay': CertificationProvenanceCopy(
    capabilityCode: 'deterministic_replay',
    explanation:
        'Indicator is based on the system ability to reconstruct execution traces in a deterministic way.',
    derivedFrom: ['ReplayTraceStore', 'Deterministic Rehydration'],
  ),
  'immutable_persistence': CertificationProvenanceCopy(
    capabilityCode: 'immutable_persistence',
    explanation:
        'Indicator is based on append-only, immutable event storage.',
    derivedFrom: ['Append-only storage', 'Immutable event log'],
  ),
  'offline_replay': CertificationProvenanceCopy(
    capabilityCode: 'offline_replay',
    explanation:
        'Indicator is based on replay of traces without an active runtime.',
    derivedFrom: ['Offline trace store', 'Replay engine'],
  ),
  'forensic_export': CertificationProvenanceCopy(
    capabilityCode: 'forensic_export',
    explanation:
        'Indicator is based on export of audit artifacts in a structured format.',
    derivedFrom: ['Exportable audit artifacts', 'Structured trace format'],
  ),
  'forensic_import_verification': CertificationProvenanceCopy(
    capabilityCode: 'forensic_import_verification',
    explanation:
        'Indicator is based on integrity verification of imported forensic data.',
    derivedFrom: ['Import verifier', 'Hash verification'],
  ),
  'compliance_mapping_present': CertificationProvenanceCopy(
    capabilityCode: 'compliance_mapping_present',
    explanation:
        'Indicator is based on the presence of a static mapping of technical capabilities.',
    derivedFrom: ['Capability mapping registry', 'Static mapping table'],
  ),
};

/// Lookup read-only. ArgumentError se capabilityCode non presente.
CertificationProvenanceCopy provenanceFor(String capabilityCode) {
  final copy = certificationProvenanceRegistry[capabilityCode];
  if (copy == null) {
    throw ArgumentError('Unknown capability code: $capabilityCode');
  }
  return copy;
}
