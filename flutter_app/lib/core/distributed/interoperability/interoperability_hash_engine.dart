// ODA-10 — Canonical interoperability fingerprint.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class InteroperabilityHashEngine {
  InteroperabilityHashEngine._();

  static String computeInteroperabilityHash({
    required String interoperabilityRegistryHash,
    required List<String> activeBridgeContractHashes,
    required String interoperabilityLedgerHash,
    required List<String> externalSnapshotHashes,
  }) {
    final sortedContracts = List<String>.from(activeBridgeContractHashes)..sort();
    final sortedSnapshots = List<String>.from(externalSnapshotHashes)..sort();
    return CanonicalPayload.hash(<String, dynamic>{
      'interoperabilityRegistryHash': interoperabilityRegistryHash,
      'activeBridgeContractHashes': sortedContracts,
      'interoperabilityLedgerHash': interoperabilityLedgerHash,
      'externalSnapshotHashes': sortedSnapshots,
    });
  }
}
