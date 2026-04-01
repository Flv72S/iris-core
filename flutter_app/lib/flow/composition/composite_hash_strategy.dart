// M2 — Deterministic composite hash strategy. FNV-1a 32-bit; no side effects, no runtime deps.

import 'dart:typed_data';

/// Strategy for computing composite deterministic hash from canonical composite bytes.
/// FNV-1a 32-bit; order-sensitive; no entropy, no caching.
class CompositeHashStrategy {
  CompositeHashStrategy._();

  /// FNV-1a 32-bit over [canonicalCompositeBytes]. Same bytes → same hash. No side effects.
  static int compute(Uint8List canonicalCompositeBytes) {
    const int offsetBasis = 0x811c9dc5;
    const int prime = 0x01000193;
    int h = offsetBasis;
    for (var i = 0; i < canonicalCompositeBytes.length; i++) {
      h ^= canonicalCompositeBytes[i] & 0xff;
      h = (h * prime) & 0xffffffff;
    }
    return h;
  }
}
