// ODA-1 — Canonical cluster fingerprint. Stable hash from membership and cluster ID.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Produces deterministic cluster hash from membership ledger hash, ordered node identities, cluster ID.
class DeterministicClusterHasher {
  DeterministicClusterHasher._();

  /// [nodeIds] must be in canonical order (sorted). Same inputs → same hash.
  static String clusterHash({
    required String membershipLedgerHash,
    required List<String> nodeIds,
    required String clusterId,
  }) {
    final canonical = <String, dynamic>{
      'clusterId': clusterId,
      'membershipLedgerHash': membershipLedgerHash,
      'nodeIds': List<String>.from(nodeIds)..sort(),
    };
    return CanonicalPayload.hash(canonical);
  }

  /// Hash of membership ledger content (events in order). For [validateMembershipLedger].
  static String membershipLedgerHash(List<Map<String, dynamic>> eventsInOrder) {
    final payload = <String, dynamic>{'events': eventsInOrder};
    return CanonicalPayload.hash(payload);
  }
}
