// F1 — Read-only trust state reader. Observable signals only; no evaluation.

import 'package:iris_flutter_app/flow_boundary/flow_core_contract.dart';

import 'core_consumption_models.dart';

/// Reads trust state via contract. Exposes presence of signals only; no validity judgment.
class TrustStateReader {
  TrustStateReader(this._contract);

  final IFlowCoreContract _contract;

  /// Returns observable trust signals. No "isTrusted" or "isValid"; only presence.
  FlowTrustState readTrustState() {
    final trust = _contract.trustStateReader.readTrustState();
    final snapshotHashPresent = trust.structuralHash.isNotEmpty;
    final traceabilityPresent = trust.freezeSealHash.isNotEmpty;
    final availableTrustSignals = <String>[
      if (snapshotHashPresent) 'structural_hash',
      if (traceabilityPresent) 'freeze_seal',
      if (trust.hasValidChain) 'audit_chain',
    ];
    return FlowTrustState(
      snapshotHashPresent: snapshotHashPresent,
      traceabilityPresent: traceabilityPresent,
      availableTrustSignals: availableTrustSignals,
    );
  }
}
