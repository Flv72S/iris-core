// ODA-7 — Deterministic settlement between clusters. Contract-bound.

import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';

class CrossClusterSettlement {
  const CrossClusterSettlement({
    required this.originClusterId,
    required this.targetClusterId,
    required this.settlementAmount,
    required this.proofOfBalance,
    required this.contractReference,
    this.multiSignature,
  });

  final String originClusterId;
  final String targetClusterId;
  final int settlementAmount;
  final String proofOfBalance;
  final String contractReference;
  final String? multiSignature;

  static CrossClusterSettlement createSettlement({
    required String originClusterId,
    required String targetClusterId,
    required int settlementAmount,
    required String proofOfBalance,
    required String contractReference,
    String? multiSignature,
  }) {
    return CrossClusterSettlement(
      originClusterId: originClusterId,
      targetClusterId: targetClusterId,
      settlementAmount: settlementAmount,
      proofOfBalance: proofOfBalance,
      contractReference: contractReference,
      multiSignature: multiSignature,
    );
  }

  static bool verifySettlement(
    CrossClusterSettlement settlement,
    bool Function(String proofOfBalance, int amount) verifyProof,
  ) {
    if (settlement.settlementAmount < 0) return false;
    return verifyProof(settlement.proofOfBalance, settlement.settlementAmount);
  }

  static void applySettlement(
    CrossClusterSettlement settlement,
    EconomicLedger originLedger,
    EconomicLedger targetLedger,
    String originActorId,
    String targetActorId,
  ) {
    if (settlement.settlementAmount <= 0) return;
    originLedger.appendEconomicEvent(EconomicEvent(
      eventType: EconomicEventType.balanceTransferred,
      eventIndex: originLedger.events.length,
      actorId: originActorId,
      amount: settlement.settlementAmount,
      targetActorId: targetActorId,
      payload: {'contractReference': settlement.contractReference},
      signature: settlement.multiSignature ?? '',
    ));
    targetLedger.appendEconomicEvent(EconomicEvent(
      eventType: EconomicEventType.balanceTransferred,
      eventIndex: targetLedger.events.length,
      actorId: originActorId,
      amount: settlement.settlementAmount,
      targetActorId: targetActorId,
      payload: {'contractReference': settlement.contractReference, 'fromCluster': settlement.originClusterId},
      signature: settlement.multiSignature ?? '',
    ));
  }
}
