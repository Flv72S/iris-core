// ODA-5 — Federation terms. Deterministic, signed by both, immutable when active.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Defines terms of federation. Hash-verifiable; immutable once active.
class FederationContract {
  const FederationContract({
    required this.contractId,
    required this.clusterAId,
    required this.clusterBId,
    required this.allowedDomains,
    required this.allowedEventTypes,
    required this.authorizationRequirements,
    required this.scopeRestrictions,
    required this.contractHash,
    required this.signatureA,
    required this.signatureB,
  });

  final String contractId;
  final String clusterAId;
  final String clusterBId;
  final List<String> allowedDomains;
  final List<String> allowedEventTypes;
  final Map<String, dynamic> authorizationRequirements;
  final Map<String, dynamic> scopeRestrictions;
  final String contractHash;
  final String signatureA;
  final String signatureB;

  Map<String, dynamic> get contractPayload => <String, dynamic>{
        'contractId': contractId,
        'clusterAId': clusterAId,
        'clusterBId': clusterBId,
        'allowedDomains': List<String>.from(allowedDomains)..sort(),
        'allowedEventTypes': List<String>.from(allowedEventTypes)..sort(),
        'authorizationRequirements': authorizationRequirements,
        'scopeRestrictions': scopeRestrictions,
      };
}

class FederationContractFactory {
  FederationContractFactory._();

  static FederationContract createFederationContract({
    required String contractId,
    required String clusterAId,
    required String clusterBId,
    required List<String> allowedDomains,
    required List<String> allowedEventTypes,
    required Map<String, dynamic> authorizationRequirements,
    required Map<String, dynamic> scopeRestrictions,
    required String signatureA,
    required String signatureB,
  }) {
    final payload = <String, dynamic>{
      'contractId': contractId,
      'clusterAId': clusterAId,
      'clusterBId': clusterBId,
      'allowedDomains': List<String>.from(allowedDomains)..sort(),
      'allowedEventTypes': List<String>.from(allowedEventTypes)..sort(),
      'authorizationRequirements': authorizationRequirements,
      'scopeRestrictions': scopeRestrictions,
    };
    final contractHash = CanonicalPayload.hash(payload);
    return FederationContract(
      contractId: contractId,
      clusterAId: clusterAId,
      clusterBId: clusterBId,
      allowedDomains: allowedDomains,
      allowedEventTypes: allowedEventTypes,
      authorizationRequirements: authorizationRequirements,
      scopeRestrictions: scopeRestrictions,
      contractHash: contractHash,
      signatureA: signatureA,
      signatureB: signatureB,
    );
  }

  static bool verifyFederationContract(
    FederationContract contract,
    bool Function(String clusterId, String payloadHash, String signature) verifySignature,
  ) {
    final expectedHash = CanonicalPayload.hash(contract.contractPayload);
    if (contract.contractHash != expectedHash) return false;
    if (!verifySignature(contract.clusterAId, contract.contractHash, contract.signatureA)) return false;
    if (!verifySignature(contract.clusterBId, contract.contractHash, contract.signatureB)) return false;
    return true;
  }

  static String getContractHash(FederationContract contract) => contract.contractHash;
}
