// ODA-7 — Canonical economic fingerprint.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class EconomicHashEngine {
  EconomicHashEngine._();

  static String computeEconomicHash({
    required String economicLedgerHash,
    required String stakeLedgerHash,
    required String reputationHash,
    required String economicPolicyHash,
  }) {
    return CanonicalPayload.hash(<String, dynamic>{
      'economicLedgerHash': economicLedgerHash,
      'stakeLedgerHash': stakeLedgerHash,
      'reputationHash': reputationHash,
      'economicPolicyHash': economicPolicyHash,
    });
  }
}
