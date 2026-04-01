// ODA-6 — Policy version history. Deterministic; new version references previous hash.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class PolicyVersionEntry {
  const PolicyVersionEntry({
    required this.policyId,
    required this.version,
    required this.versionHash,
    required this.previousVersionHash,
  });
  final String policyId;
  final int version;
  final String versionHash;
  final String previousVersionHash;
}

class PolicyVersionLedger {
  PolicyVersionLedger();

  final List<PolicyVersionEntry> _entries = [];

  List<PolicyVersionEntry> get entries => List.unmodifiable(_entries);

  void registerPolicyVersion(PolicyVersionEntry entry) {
    _entries.add(entry);
  }

  List<PolicyVersionEntry> getPolicyVersionHistory(String policyId) {
    return _entries.where((e) => e.policyId == policyId).toList()
      ..sort((a, b) => a.version.compareTo(b.version));
  }

  static String computeVersionHash(String policyId, int version, String previousVersionHash) {
    return CanonicalPayload.hash(<String, dynamic>{
      'policyId': policyId,
      'version': version,
      'previousVersionHash': previousVersionHash,
    });
  }
}
