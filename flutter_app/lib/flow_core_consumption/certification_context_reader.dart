// F1 — Read-only certification context reader. Reference data only; no interpretation.

import 'package:iris_flutter_app/flow_boundary/flow_core_contract.dart';

import 'core_consumption_models.dart';

/// Reads certification context via contract. No comparison or legal inference.
class CertificationContextReader {
  CertificationContextReader(this._contract);

  final IFlowCoreContract _contract;

  /// Returns Flow-side context. Preserves order and content; no semantic validation.
  FlowCertificationContext readCertificationContext() {
    final context = _contract.certificationContextReader.readCertificationContext();
    return FlowCertificationContext(
      manifestVersion: context.manifestVersion,
      structuralHash: _contract.structuralHashReader.readStructuralHash().value,
      packageHash: context.packageHash,
      evidenceEntryIds: List.from(context.evidenceEntryIds),
    );
  }
}
