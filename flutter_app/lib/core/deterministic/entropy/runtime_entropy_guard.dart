/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Runtime guard to assert no entropy usage in deterministic code paths.

import 'package:iris_flutter_app/core/deterministic/entropy/entropy_violation.dart';

/// Lightweight runtime guard. Call explicitly in deterministic modules
/// when a code path must be guaranteed entropy-free.
class RuntimeEntropyGuard {
  RuntimeEntropyGuard._();

  /// Throws [EntropyViolation] if any forbidden flag is true.
  /// Call after a code path that must not use time, random, or platform.
  static void assertNoEntropyUsage({
    required bool usesTime,
    required bool usesRandom,
    required bool usesPlatform,
  }) {
    if (usesTime) {
      throw EntropyViolation('Entropy detected: time usage');
    }
    if (usesRandom) {
      throw EntropyViolation('Entropy detected: random usage');
    }
    if (usesPlatform) {
      throw EntropyViolation('Entropy detected: platform usage');
    }
  }
}
