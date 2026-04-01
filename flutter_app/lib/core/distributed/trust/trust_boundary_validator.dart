// ODA-4 — Central enforcement: domain membership, cross-domain auth, activation/suspension.

import 'package:iris_flutter_app/core/distributed/trust/domain_scoped_event.dart';
import 'package:iris_flutter_app/core/distributed/trust/cross_domain_authorization.dart';
import 'package:iris_flutter_app/core/distributed/trust/trust_domain_registry.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_membership_ledger.dart';

/// Result of trust validation. Must run before event acceptance/replication/projection.
class TrustValidationResult {
  const TrustValidationResult({
    required this.valid,
    this.domainMembershipInvalid = false,
    this.crossDomainUnauthorized = false,
    this.domainSuspended = false,
    this.domainUnknown = false,
  });
  final bool valid;
  final bool domainMembershipInvalid;
  final bool crossDomainUnauthorized;
  final bool domainSuspended;
  final bool domainUnknown;
}

class TrustBoundaryValidator {
  TrustBoundaryValidator._();

  /// Validate event trust: domain membership, cross-domain authorization, domain status.
  static TrustValidationResult validateEventTrust({
    required DomainScopedEvent event,
    required String signingNodeId,
    required DomainMembershipLedger membershipLedger,
    required TrustDomainRegistry registry,
    CrossDomainAuthorization? crossDomainAuth,
    bool Function(String nodeId, String domainId)? customNodeDomainCheck,
  }) {
    if (registry.getSuspendedDomains().contains(event.originDomainId)) {
      return const TrustValidationResult(valid: false, domainSuspended: true);
    }
    if (!registry.getActiveDomains().contains(event.originDomainId)) {
      return const TrustValidationResult(valid: false, domainUnknown: true);
    }
    final nodeDomain = membershipLedger.getNodeDomain(signingNodeId);
    if (nodeDomain == null || nodeDomain != event.originDomainId) {
      return const TrustValidationResult(valid: false, domainMembershipInvalid: true);
    }
    if (customNodeDomainCheck != null && !customNodeDomainCheck(signingNodeId, event.originDomainId)) {
      return const TrustValidationResult(valid: false, domainMembershipInvalid: true);
    }
    if (event.crossDomain) {
      if (event.authorizationReference == null || crossDomainAuth == null) {
        return const TrustValidationResult(valid: false, crossDomainUnauthorized: true);
      }
      if (crossDomainAuth.contractHash != event.authorizationReference) {
        return const TrustValidationResult(valid: false, crossDomainUnauthorized: true);
      }
    }
    return const TrustValidationResult(valid: true);
  }
}
