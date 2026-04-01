import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/certification/deterministic_core_freeze_guard.dart';

/// N16 — Verification that the freeze guard is callable in dev/test contexts.
/// It must not throw and must not influence deterministic execution.
void main() {
  test('DeterministicCoreFreezeGuard.assertFrozen() is no-op when called', () {
    DeterministicCoreFreezeGuard.assertFrozen();
  });
}
