// Phase 11.8.1 — Pure gate verification. Deterministic; no side-effects.

import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack_serializer.dart';
import 'package:iris_flutter_app/ui/forensic_import/verified_forensic_bundle.dart';

import 'certification_gate_result.dart';
import 'certification_gate_state.dart';

/// Verifies certification gate. Order is strict; result includes hashes and reason.
CertificationGateResult verifyCertificationGate({
  required VerifiedForensicBundle? bundle,
  required CompliancePack? pack,
}) {
  if (bundle == null) {
    return CertificationGateResult(
      state: CertificationGateState.closedMissingBundle,
      reason: 'missing bundle',
    );
  }
  if (pack == null) {
    return CertificationGateResult(
      state: CertificationGateState.closedInvalidPack,
      bundleHash: bundle.verifiedHash,
      reason: 'missing pack',
    );
  }
  if (!CompliancePackSerializer.verifyPackHash(pack)) {
    return CertificationGateResult(
      state: CertificationGateState.closedInvalidPack,
      bundleHash: bundle.verifiedHash,
      packHash: pack.packHash,
      reason: 'pack hash mismatch',
    );
  }
  if (pack.generatedFromBundleHash != bundle.verifiedHash) {
    return CertificationGateResult(
      state: CertificationGateState.closedHashMismatch,
      bundleHash: bundle.verifiedHash,
      packHash: pack.packHash,
      reason: 'bundle hash does not match pack reference',
    );
  }
  return CertificationGateResult(
    state: CertificationGateState.open,
    bundleHash: bundle.verifiedHash,
    packHash: pack.packHash,
    reason: 'verified',
  );
}
