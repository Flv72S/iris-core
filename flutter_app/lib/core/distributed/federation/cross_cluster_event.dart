// ODA-5 — Event emitted in one cluster for another. Contract-bound; proof of origin.

/// Cross-cluster event. Must include proof of inclusion in origin ledger.
class CrossClusterEvent {
  const CrossClusterEvent({
    required this.originClusterId,
    required this.originDomainId,
    required this.targetClusterId,
    required this.federationContractHash,
    required this.eventPayload,
    required this.proofOfOriginLedgerInclusion,
    this.multiSignature,
  });

  final String originClusterId;
  final String originDomainId;
  final String targetClusterId;
  final String federationContractHash;
  final Map<String, dynamic> eventPayload;
  final String proofOfOriginLedgerInclusion;
  final String? multiSignature;

  static CrossClusterEvent createCrossClusterEvent({
    required String originClusterId,
    required String originDomainId,
    required String targetClusterId,
    required String federationContractHash,
    required Map<String, dynamic> eventPayload,
    required String proofOfOriginLedgerInclusion,
    String? multiSignature,
  }) {
    return CrossClusterEvent(
      originClusterId: originClusterId,
      originDomainId: originDomainId,
      targetClusterId: targetClusterId,
      federationContractHash: federationContractHash,
      eventPayload: eventPayload,
      proofOfOriginLedgerInclusion: proofOfOriginLedgerInclusion,
      multiSignature: multiSignature,
    );
  }

  Map<String, dynamic> get verificationPayload => <String, dynamic>{
        'originClusterId': originClusterId,
        'originDomainId': originDomainId,
        'targetClusterId': targetClusterId,
        'federationContractHash': federationContractHash,
        'eventPayload': eventPayload,
        'proofOfOriginLedgerInclusion': proofOfOriginLedgerInclusion,
      };

  static bool verifyCrossClusterEvent(
    CrossClusterEvent event,
    bool Function(String originClusterId, Map<String, dynamic> payload, String proof) verifyProof,
  ) {
    return verifyProof(
      event.originClusterId,
      event.verificationPayload,
      event.proofOfOriginLedgerInclusion,
    );
  }
}
