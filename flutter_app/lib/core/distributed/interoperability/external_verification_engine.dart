// ODA-10 — Validate external interaction.

import 'package:iris_flutter_app/core/distributed/interoperability/external_proof_artifact.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/interoperability_registry.dart';
import 'package:iris_flutter_app/core/distributed/interoperability/bridge_contract.dart';

class ExternalVerificationResult {
  const ExternalVerificationResult({
    required this.valid,
    this.missingProof = false,
    this.invalidSignature = false,
    this.contractMismatch = false,
    this.suspendedExternalSystem = false,
    this.operationNotPermitted = false,
    this.externalSystemNotRegistered = false,
  });
  final bool valid;
  final bool missingProof;
  final bool invalidSignature;
  final bool contractMismatch;
  final bool suspendedExternalSystem;
  final bool operationNotPermitted;
  final bool externalSystemNotRegistered;
}

class ExternalVerificationEngine {
  ExternalVerificationEngine._();

  static ExternalVerificationResult validateExternalInteraction({
    required ExternalProofArtifact artifact,
    required Map<String, dynamic> context,
    required InteroperabilityRegistry registry,
    required BridgeContract contract,
    required bool Function(ExternalProofArtifact a) verifyProof,
  }) {
    if (registry.isSuspended(artifact.externalSystemId)) {
      return const ExternalVerificationResult(valid: false, suspendedExternalSystem: true);
    }
    if (!registry.getActiveExternalSystems().contains(artifact.externalSystemId)) {
      return const ExternalVerificationResult(valid: false, externalSystemNotRegistered: true);
    }
    if (contract.externalSystemId != artifact.externalSystemId) {
      return const ExternalVerificationResult(valid: false, contractMismatch: true);
    }
    if (!verifyProof(artifact)) {
      return const ExternalVerificationResult(valid: false, invalidSignature: true);
    }
    final op = context['operation'] as String?;
    if (op != null && !contract.permittedOperations.contains(op)) {
      return const ExternalVerificationResult(valid: false, operationNotPermitted: true);
    }
    return const ExternalVerificationResult(valid: true);
  }
}
