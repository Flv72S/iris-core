// Microstep 12.3 — Read-only provider. Declares what is present; no verification, no normative claim.

import 'certification_capability.dart';
import 'certification_status.dart';

/// Snapshot deterministico di CertificationStatus. Read-only; nessuna mutazione né logica decisionale.
final class CertificationStatusProvider {
  CertificationStatusProvider() : _status = _snapshot;

  static const CertificationStatus _snapshot = CertificationStatus(
    version: '12.3',
    generatedBy: 'IRIS Certification Runtime',
    description: 'Technical capability index for audit',
    capabilities: [
      CertificationCapability.deterministicReplay,
      CertificationCapability.immutablePersistence,
      CertificationCapability.offlineReplay,
      CertificationCapability.forensicExport,
      CertificationCapability.forensicImportVerification,
      CertificationCapability.complianceMappingPresent,
    ],
    evidenceRefs: [],
  );

  final CertificationStatus _status;

  CertificationStatus get status => _status;
}
