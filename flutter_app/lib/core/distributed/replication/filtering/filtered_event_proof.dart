// ODA-3 — Cryptographic proof that filtered view is derived from canonical ledger.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Proof type: inclusion (event in filtered view) or exclusion (index skipped).
enum FilteredProofType { inclusion, exclusion }

/// Proof that filtered view is derived from global ledger (no alter/fabricate/reorder).
class FilteredEventProof {
  const FilteredEventProof({
    required this.globalIndex,
    required this.eventHash,
    required this.proofType,
    required this.membershipValidationProof,
    this.exclusionMarker = false,
    required this.proofPayloadHash,
  });

  final int globalIndex;
  final String eventHash;
  final FilteredProofType proofType;
  /// Opaque proof that event was under valid membership at event time.
  final String membershipValidationProof;
  /// True when proof is for an excluded index (exclusion proof).
  final bool exclusionMarker;
  /// Hash of (globalIndex, eventHash, scopeHash, inclusion/exclusion) for verification.
  final String proofPayloadHash;

  /// Generates inclusion proof for an event that is in the filtered view.
  static FilteredEventProof generateInclusionProof({
    required int globalIndex,
    required String eventHash,
    required String scopeHash,
    required String membershipValidationProof,
  }) {
    final payload = <String, dynamic>{
      'globalIndex': globalIndex,
      'eventHash': eventHash,
      'scopeHash': scopeHash,
      'included': true,
    };
    return FilteredEventProof(
      globalIndex: globalIndex,
      eventHash: eventHash,
      proofType: FilteredProofType.inclusion,
      membershipValidationProof: membershipValidationProof,
      exclusionMarker: false,
      proofPayloadHash: CanonicalPayload.hash(payload),
    );
  }

  /// Generates exclusion proof for a global index not in filtered view.
  static FilteredEventProof generateExclusionProof({
    required int index,
    required String scopeHash,
    required String eventHashAtIndex,
  }) {
    final payload = <String, dynamic>{
      'globalIndex': index,
      'eventHash': eventHashAtIndex,
      'scopeHash': scopeHash,
      'included': false,
    };
    return FilteredEventProof(
      globalIndex: index,
      eventHash: eventHashAtIndex,
      proofType: FilteredProofType.exclusion,
      membershipValidationProof: '',
      exclusionMarker: true,
      proofPayloadHash: CanonicalPayload.hash(payload),
    );
  }

  /// Verifies proof integrity (payload hash and type consistency).
  static bool verifyProof(FilteredEventProof proof, String scopeHash) {
    final expectedPayload = <String, dynamic>{
      'globalIndex': proof.globalIndex,
      'eventHash': proof.eventHash,
      'scopeHash': scopeHash,
      'included': proof.proofType == FilteredProofType.inclusion,
    };
    final expectedHash = CanonicalPayload.hash(expectedPayload);
    if (proof.proofPayloadHash != expectedHash) return false;
    if (proof.proofType == FilteredProofType.exclusion &&
        proof.exclusionMarker != true) return false;
    if (proof.proofType == FilteredProofType.inclusion &&
        proof.exclusionMarker != false) return false;
    return true;
  }
}
