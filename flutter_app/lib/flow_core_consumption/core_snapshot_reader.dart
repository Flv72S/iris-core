// F1 — Read-only Core snapshot reader. Projects contract data to Flow DTOs.

import 'package:iris_flutter_app/flow_boundary/flow_core_contract.dart';

import 'core_consumption_models.dart';

/// Reads Core snapshot via contract and projects to Flow-side snapshot. No mutation.
class CoreSnapshotReader {
  CoreSnapshotReader(this._contract);

  final IFlowCoreContract _contract;

  /// Returns Flow-side snapshot. Same contract input → same output. Deterministic.
  FlowCoreSnapshot readSnapshot() {
    final structural = _contract.structuralHashReader.readStructuralHash();
    final context = _contract.certificationContextReader.readCertificationContext();
    return FlowCoreSnapshot(
      structuralHash: structural.value,
      manifestVersion: context.manifestVersion,
    );
  }
}
