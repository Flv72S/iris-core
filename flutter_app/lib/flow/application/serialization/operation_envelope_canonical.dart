// L2 — Canonical form: immutable byte blob for signature/hash/audit.

import 'dart:typed_data';

/// Immutable canonical bytes of an operation envelope. Deterministic, byte-oriented.
/// Stored as defensive, unmodifiable copy.
class OperationEnvelopeCanonical {
  OperationEnvelopeCanonical(List<int> bytes)
      : assert(bytes.isNotEmpty, 'bytes must be non-empty'),
        bytes = Uint8List.fromList(bytes).asUnmodifiableView();

  final Uint8List bytes;
}
