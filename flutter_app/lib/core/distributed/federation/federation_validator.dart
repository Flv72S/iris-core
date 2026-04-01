// ODA-5 — Enforce federation rules before accepting cross-cluster events.

import 'package:iris_flutter_app/core/distributed/federation/cross_cluster_event.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_registry.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_contract.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_membership_ledger.dart';

class FederatedEventValidationResult {
  const FederatedEventValidationResult({
    required this.valid,
    this.federationInactive = false,
    this.contractInvalid = false,
    this.domainUnauthorized = false,
    this.eventTypeNotPermitted = false,
    this.proofOfOriginInvalid = false,
    this.originIntegrityInvalid = false,
  });
  final bool valid;
  final bool federationInactive;
  final bool contractInvalid;
  final bool domainUnauthorized;
  final bool eventTypeNotPermitted;
  final bool proofOfOriginInvalid;
  final bool originIntegrityInvalid;
}

class FederationValidator {
  FederationValidator._();

  static String _pair(String a, String b) {
    return a.compareTo(b) < 0 ? '$a:$b' : '$b:$a';
  }

  static FederatedEventValidationResult validateFederatedEvent({
    required CrossClusterEvent event,
    required String localClusterId,
    required FederationRegistry registry,
    required FederationContract contract,
    required FederationMembershipLedger membershipLedger,
    required bool Function(CrossClusterEvent e) verifyProofOfOrigin,
    required bool Function(String originClusterHash) verifyOriginIntegrityHash,
    String? originClusterHash,
  }) {
    final pair = _pair(event.originClusterId, event.targetClusterId);
    if (!registry.getActiveFederations().contains(pair)) {
      return const FederatedEventValidationResult(valid: false, federationInactive: true);
    }
    if (event.federationContractHash != contract.contractHash) {
      return const FederatedEventValidationResult(valid: false, contractInvalid: true);
    }
    if (!contract.allowedDomains.contains(event.originDomainId)) {
      return const FederatedEventValidationResult(valid: false, domainUnauthorized: true);
    }
    final eventType = event.eventPayload['eventType'] as String?;
    if (eventType != null &&
        contract.allowedEventTypes.isNotEmpty &&
        !contract.allowedEventTypes.contains(eventType)) {
      return const FederatedEventValidationResult(valid: false, eventTypeNotPermitted: true);
    }
    if (!verifyProofOfOrigin(event)) {
      return const FederatedEventValidationResult(valid: false, proofOfOriginInvalid: true);
    }
    if (originClusterHash != null && !verifyOriginIntegrityHash(originClusterHash)) {
      return const FederatedEventValidationResult(valid: false, originIntegrityInvalid: true);
    }
    return const FederatedEventValidationResult(valid: true);
  }
}
