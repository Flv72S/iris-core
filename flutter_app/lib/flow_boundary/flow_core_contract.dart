// F0 — IRIS Flow boundary. Read-only surface for Flow to Core. No mutative operations.

/// Immutable snapshot of structural identity. Read-only.
class StructuralHashSnapshot {
  const StructuralHashSnapshot({required this.value});
  final String value;
}

/// Immutable trust state exposure. Read-only.
class TrustStateSnapshot {
  const TrustStateSnapshot({
    required this.structuralHash,
    required this.freezeSealHash,
    required this.hasValidChain,
  });
  final String structuralHash;
  final String freezeSealHash;
  final bool hasValidChain;
}

/// Immutable certification context for display. Read-only.
class CertificationContextSnapshot {
  const CertificationContextSnapshot({
    required this.manifestVersion,
    required this.evidenceEntryIds,
    required this.packageHash,
  });
  final String manifestVersion;
  final List<String> evidenceEntryIds;
  final String packageHash;
}

/// Read-only access to Core structural hash.
abstract interface class IStructuralHashReader {
  StructuralHashSnapshot readStructuralHash();
}

/// Read-only access to Core trust state.
abstract interface class ITrustStateReader {
  TrustStateSnapshot readTrustState();
}

/// Read-only access to certification context.
abstract interface class ICertificationContextReader {
  CertificationContextSnapshot readCertificationContext();
}

/// Single read-only surface for Flow. No side effects.
abstract interface class IFlowCoreContract {
  IStructuralHashReader get structuralHashReader;
  ITrustStateReader get trustStateReader;
  ICertificationContextReader get certificationContextReader;
}
