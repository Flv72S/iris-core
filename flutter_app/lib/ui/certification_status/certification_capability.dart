// Microstep 12.1 — Closed set of technical capabilities. No normative claim.

/// Closed enum of technical capabilities exposed by the system. Descriptive only.
enum CertificationCapability {
  deterministicReplay('deterministic_replay'),
  immutablePersistence('immutable_persistence'),
  offlineReplay('offline_replay'),
  forensicExport('forensic_export'),
  forensicImportVerification('forensic_import_verification'),
  complianceMappingPresent('compliance_mapping_present');

  const CertificationCapability(this.code);
  final String code;

  static CertificationCapability fromCode(String code) {
    for (final v in CertificationCapability.values) {
      if (v.code == code) return v;
    }
    throw ArgumentError('Unknown CertificationCapability code: $code');
  }
}
