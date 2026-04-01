/// OX4 — Runtime guard for deterministic context. Development and testing.

class UIDeterministicGuard {
  UIDeterministicGuard._();

  static bool _inSection = false;
  static bool _violation = false;
  static String _violationKind = '';

  static void enterDeterministicSection() {
    _inSection = true;
    _violation = false;
    _violationKind = '';
  }

  static void exitDeterministicSection() {
    _inSection = false;
  }

  /// Call when forbidden operation is attempted (e.g. ledger access, mutation, random).
  static void recordViolation(String kind) {
    if (_inSection) {
      _violation = true;
      _violationKind = kind;
    }
  }

  /// Throws if a violation was recorded in the current section.
  static void assertDeterministicContext() {
    if (_violation) {
      throw StateError('Determinism violation: $_violationKind');
    }
  }

  static bool get isInDeterministicSection => _inSection;
}
