// OX9 — Read-only integrity checks. Detects hash drift, corrupted projection, signature mismatch.

import 'package:iris_flutter_app/core/production/integrity_report.dart';

/// Provider interface for integrity checks. Production layer does not depend on concrete ledger/projection.
abstract class IntegrityCheckProvider {
  String? get ledgerHash;
  bool get projectionHashConsistent;
  bool get signatureValidityOk;
  bool get identityConsistencyOk;
  bool get forkCorrectnessOk;
}

/// Continuously (on demand) verify ledger hash, projection consistency, signatures, identity, fork.
/// Read-only; does not mutate state. Report deterministic for same state.
class RuntimeIntegrityMonitor {
  RuntimeIntegrityMonitor({required IntegrityCheckProvider provider})
      : _provider = provider;

  final IntegrityCheckProvider _provider;

  /// Runs integrity check. Must be read-only. Same state → same report.
  IntegrityReport runIntegrityCheck({String? configHash}) {
    return IntegrityReport(
      ledgerHashOk: _provider.ledgerHash != null && _provider.ledgerHash!.isNotEmpty,
      projectionHashOk: _provider.projectionHashConsistent,
      signatureValidityOk: _provider.signatureValidityOk,
      identityConsistencyOk: _provider.identityConsistencyOk,
      forkCorrectnessOk: _provider.forkCorrectnessOk,
      ledgerHash: _provider.ledgerHash,
      configHash: configHash,
      details: [],
    );
  }
}
