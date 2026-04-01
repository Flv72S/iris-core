/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

class DeterministicGuard {
  DeterministicGuard._();

  static void assertNoDateTimeUsage() {
    // Placeholder: expand in later steps (e.g. static analysis / codegen).
  }

  static void assertNoRandomUsage() {
    // Placeholder: expand in later steps.
  }

  static void assertCanonicalOrdering(Map<dynamic, dynamic> map) {
    // Placeholder: expand in later steps (e.g. verify key iteration order).
  }

  static void assertPureFunction(Function fn) {
    // Placeholder: expand in later steps (e.g. purity analysis).
  }
}
