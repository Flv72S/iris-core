// L6 — Freezable, hashable execution contract. No execution; no infra; no serialization.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/application/contract/execution_contract_hasher.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical.dart';

/// Immutable contract of a deterministic execution. Hash derived only from canonical bytes.
class DeterministicExecutionContract {
  DeterministicExecutionContract({
    required this.operationId,
    required this.resourceId,
    required Uint8List canonicalBytes,
    required this.deterministicHash,
  }) : canonicalBytes = Uint8List.fromList(canonicalBytes).asUnmodifiableView();

  final String operationId;
  final String resourceId;
  final Uint8List canonicalBytes;
  final int deterministicHash;

  /// Builds contract from envelope + canonical form. Does not recalculate canonical or verify signature.
  factory DeterministicExecutionContract.fromCanonical({
    required OperationEnvelope envelope,
    required OperationEnvelopeCanonical canonical,
    required ExecutionContractHasher hasher,
  }) {
    final h = hasher.hash(canonical.bytes);
    return DeterministicExecutionContract(
      operationId: envelope.operationId,
      resourceId: envelope.resourceId,
      canonicalBytes: canonical.bytes,
      deterministicHash: h,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! DeterministicExecutionContract) return false;
    return operationId == other.operationId &&
        resourceId == other.resourceId &&
        deterministicHash == other.deterministicHash &&
        _bytesEqual(canonicalBytes, other.canonicalBytes);
  }

  @override
  int get hashCode => Object.hash(operationId, resourceId, deterministicHash, _bytesHash(canonicalBytes));

  static bool _bytesEqual(Uint8List a, Uint8List b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static int _bytesHash(Uint8List b) {
    var h = 0;
    for (var i = 0; i < b.length; i++) {
      h = Object.hash(h, b[i]);
    }
    return h;
  }
}
