/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Thrown when entropy usage is detected in the deterministic core.

import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';

/// Exception thrown when a forbidden entropy source is used
/// (time, randomness, platform, IO, etc.) inside the deterministic core.
class EntropyViolation extends DeterministicViolation {
  EntropyViolation([String? message]) : super(message);
}
