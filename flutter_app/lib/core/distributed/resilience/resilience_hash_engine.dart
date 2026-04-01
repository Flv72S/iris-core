// ODA-9 — Canonical resilience fingerprint.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ResilienceHashEngine {
  ResilienceHashEngine._();

  static String computeResilienceHash({
    required String threatModelHash,
    required String incidentRegistryHash,
    required String containmentStateHash,
    required String recoveryStateHash,
  }) {
    return CanonicalPayload.hash(<String, dynamic>{
      'threatModelHash': threatModelHash,
      'incidentRegistryHash': incidentRegistryHash,
      'containmentStateHash': containmentStateHash,
      'recoveryStateHash': recoveryStateHash,
    });
  }
}
