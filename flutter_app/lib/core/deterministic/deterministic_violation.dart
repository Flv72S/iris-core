/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

class DeterministicViolation implements Exception {
  DeterministicViolation([this.message]);

  final String? message;

  @override
  String toString() => 'DeterministicViolation: ${message ?? 'determinism violated'}';
}
