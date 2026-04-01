// OX9 — Integrity check result. Deterministic for same state.

class IntegrityReport {
  const IntegrityReport({
    required this.ledgerHashOk,
    required this.projectionHashOk,
    required this.signatureValidityOk,
    required this.identityConsistencyOk,
    required this.forkCorrectnessOk,
    this.ledgerHash,
    this.configHash,
    this.details = const [],
  });

  final bool ledgerHashOk;
  final bool projectionHashOk;
  final bool signatureValidityOk;
  final bool identityConsistencyOk;
  final bool forkCorrectnessOk;
  final String? ledgerHash;
  final String? configHash;
  final List<String> details;

  bool get isHealthy =>
      ledgerHashOk && projectionHashOk && signatureValidityOk &&
      identityConsistencyOk && forkCorrectnessOk;
}
