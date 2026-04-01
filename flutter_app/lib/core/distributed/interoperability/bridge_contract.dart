// ODA-10 — Bridge contract. Governance-approved; immutable when activated.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class BridgeContract {
  const BridgeContract({
    required this.contractId,
    required this.externalSystemId,
    required this.permittedOperations,
    required this.requiredProofTypes,
    required this.validationRulesRef,
    this.economicSettlementRulesRef,
    required this.contractHash,
  });

  final String contractId;
  final String externalSystemId;
  final List<String> permittedOperations;
  final List<String> requiredProofTypes;
  final String validationRulesRef;
  final String? economicSettlementRulesRef;
  final String contractHash;
}

class BridgeContractFactory {
  BridgeContractFactory._();

  static BridgeContract createBridgeContract({
    required String contractId,
    required String externalSystemId,
    required List<String> permittedOperations,
    required List<String> requiredProofTypes,
    required String validationRulesRef,
    String? economicSettlementRulesRef,
  }) {
    final payload = <String, dynamic>{
      'contractId': contractId,
      'externalSystemId': externalSystemId,
      'permittedOperations': (List<String>.from(permittedOperations)..sort()),
      'requiredProofTypes': (List<String>.from(requiredProofTypes)..sort()),
      'validationRulesRef': validationRulesRef,
      if (economicSettlementRulesRef != null) 'economicSettlementRulesRef': economicSettlementRulesRef,
    };
    final contractHash = CanonicalPayload.hash(payload);
    return BridgeContract(
      contractId: contractId,
      externalSystemId: externalSystemId,
      permittedOperations: permittedOperations,
      requiredProofTypes: requiredProofTypes,
      validationRulesRef: validationRulesRef,
      economicSettlementRulesRef: economicSettlementRulesRef,
      contractHash: contractHash,
    );
  }

  static bool verifyBridgeContract(BridgeContract contract) {
    final payload = <String, dynamic>{
      'contractId': contract.contractId,
      'externalSystemId': contract.externalSystemId,
      'permittedOperations': (List<String>.from(contract.permittedOperations)..sort()),
      'requiredProofTypes': (List<String>.from(contract.requiredProofTypes)..sort()),
      'validationRulesRef': contract.validationRulesRef,
      if (contract.economicSettlementRulesRef != null) 'economicSettlementRulesRef': contract.economicSettlementRulesRef,
    };
    return CanonicalPayload.hash(payload) == contract.contractHash;
  }

  static bool evaluateBridgeOperation(
    BridgeContract contract,
    Map<String, dynamic> context,
    bool Function(String operation, Map<String, dynamic> ctx) evaluator,
  ) {
    final op = context['operation'] as String?;
    if (op == null || !contract.permittedOperations.contains(op)) return false;
    return evaluator(op, context);
  }

  static String getBridgeContractHash(BridgeContract contract) => contract.contractHash;
}
