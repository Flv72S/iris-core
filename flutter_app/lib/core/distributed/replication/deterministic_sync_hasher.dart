// ODA-2 — Canonical sync fingerprint. Verify sync outcome; cross-node audit.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Produces deterministic sync hash from ledger head, divergence index, membership hash.
class DeterministicSyncHasher {
  DeterministicSyncHasher._();

  static String computeSyncHash({
    required String ledgerHeadHash,
    required int divergenceIndex,
    required String membershipHash,
  }) {
    return CanonicalPayload.hash(<String, dynamic>{
      'ledgerHeadHash': ledgerHeadHash,
      'divergenceIndex': divergenceIndex,
      'membershipHash': membershipHash,
    });
  }
}
