// ODA-5 — Deterministic federation report. Identical on replay.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_registry.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_contract.dart';
import 'package:iris_flutter_app/core/distributed/federation/federation_membership_ledger.dart';

class FederationAuditReport {
  const FederationAuditReport({
    required this.activeFederations,
    required this.contractHashes,
    required this.participatingDomains,
    required this.remoteClusterIntegrityStatus,
    required this.divergenceFlags,
    required this.suspendedFederations,
    required this.reportHash,
  });
  final List<String> activeFederations;
  final List<String> contractHashes;
  final List<String> participatingDomains;
  final Map<String, String> remoteClusterIntegrityStatus;
  final Map<String, bool> divergenceFlags;
  final List<String> suspendedFederations;
  final String reportHash;
}

class FederationAuditReportGenerator {
  FederationAuditReportGenerator._();

  static FederationAuditReport generateFederationAudit({
    required FederationRegistry registry,
    required List<FederationContract> contracts,
    required FederationMembershipLedger membershipLedger,
    Map<String, String> remoteClusterIntegrityStatus = const {},
    Map<String, bool> divergenceFlags = const {},
  }) {
    final state = registry.rebuildState();
    final active = state.activeFederationPairs.toList()..sort();
    final suspended = state.suspendedFederationPairs.toList()..sort();
    final contractHashes = contracts.map((c) => c.contractHash).toList()..sort();
    final membershipState = membershipLedger.rebuildState();
    final domains = membershipState.domainEntries.keys.toList()..sort();
    final payload = <String, dynamic>{
      'activeFederations': active,
      'contractHashes': contractHashes,
      'participatingDomains': domains,
      'remoteClusterIntegrityStatus': remoteClusterIntegrityStatus,
      'divergenceFlags': divergenceFlags,
      'suspendedFederations': suspended,
    };
    final reportHash = CanonicalPayload.hash(payload);
    return FederationAuditReport(
      activeFederations: active,
      contractHashes: contractHashes,
      participatingDomains: domains,
      remoteClusterIntegrityStatus: remoteClusterIntegrityStatus,
      divergenceFlags: divergenceFlags,
      suspendedFederations: suspended,
      reportHash: reportHash,
    );
  }
}
