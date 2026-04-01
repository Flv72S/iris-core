// ODA-6 — Canonical governance fingerprint. Cross-cluster audit.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/distributed/governance/governance_identity.dart';

class GovernanceHashEngine {
  GovernanceHashEngine._();

  static String computeGovernanceHash({
    required String governanceRegistryHash,
    required List<String> activePolicyHashes,
    required String policyVersionLedgerHash,
    required String governanceIdentityHash,
  }) {
    final sorted = List<String>.from(activePolicyHashes)..sort();
    return CanonicalPayload.hash(<String, dynamic>{
      'governanceRegistryHash': governanceRegistryHash,
      'activePolicyHashes': sorted,
      'policyVersionLedgerHash': policyVersionLedgerHash,
      'governanceIdentityHash': governanceIdentityHash,
    });
  }
}
