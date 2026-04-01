// ODA-4 — Validate node-domain association and domain existence at event time.

import 'package:iris_flutter_app/core/distributed/trust/trust_domain_registry.dart';
import 'package:iris_flutter_app/core/distributed/trust/domain_membership_ledger.dart';

class DomainMembershipValidator {
  DomainMembershipValidator._();

  /// Validate node-domain at event index. Rejects: node outside domain, unknown domain, suspended domain.
  static bool validateNodeDomain({
    required String nodeId,
    required int eventIndex,
    required String eventDomainId,
    required DomainMembershipLedger membershipLedger,
    required TrustDomainRegistry registry,
  }) {
    final nodeDomain = membershipLedger.getNodeDomain(nodeId);
    if (nodeDomain == null) return false;
    if (nodeDomain != eventDomainId) return false;
    if (!registry.getActiveDomains().contains(eventDomainId)) return false;
    if (registry.getSuspendedDomains().contains(eventDomainId)) return false;
    return true;
  }
}
