// L6 — Deterministic hash for execution contract. No external packages; stable across runs.

import 'dart:typed_data';

/// Produces a deterministic 32-bit hash from bytes. No entropy, no external packages.
/// FNV-1a 32-bit; stable across runtimes.
class ExecutionContractHasher {
  /// FNV-1a 32-bit. Same bytes → same hash.
  int hash(Uint8List bytes) {
    const int offsetBasis = 0x811c9dc5; // FNV-1a 32-bit offset basis
    const int prime = 0x01000193;
    int h = offsetBasis;
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i] & 0xff;
      h = (h * prime) & 0xffffffff; // keep 32-bit unsigned
    }
    return h;
  }
}
