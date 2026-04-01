// ODA-4 — Canonical domain integrity fingerprint. Cross-node trust validation.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/distributed/trust/trust_domain_identity.dart';

/// Produces deterministic domain hash from registry, membership ledger, ordered domain identities.
class DomainHashEngine {
  DomainHashEngine._();

  /// [domainIdentities] ordered (e.g. by domainId). Same inputs → same hash.
  static String computeDomainHash({
    required String domainRegistryHash,
    required String domainMembershipLedgerHash,
    required List<TrustDomainIdentity> domainIdentities,
  }) {
    final orderedIds = domainIdentities.map((d) => TrustDomainIdentityFactory.getDomainHash(d)).toList()
      ..sort();
    return CanonicalPayload.hash(<String, dynamic>{
      'domainRegistryHash': domainRegistryHash,
      'domainMembershipLedgerHash': domainMembershipLedgerHash,
      'domainHashes': orderedIds,
    });
  }
}
