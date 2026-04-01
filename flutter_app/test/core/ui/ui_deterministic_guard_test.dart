import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/ui/ui_deterministic_guard.dart';

void main() {
  tearDown(() {
    UIDeterministicGuard.exitDeterministicSection();
  });

  group('UIDeterministicGuard', () {
    test('assertDeterministicContext does not throw when no violation', () {
      UIDeterministicGuard.enterDeterministicSection();
      UIDeterministicGuard.assertDeterministicContext();
      UIDeterministicGuard.exitDeterministicSection();
    });

    test('assertDeterministicContext throws after recordViolation', () {
      UIDeterministicGuard.enterDeterministicSection();
      UIDeterministicGuard.recordViolation('ledger_access');
      expect(
        UIDeterministicGuard.assertDeterministicContext,
        throwsStateError,
      );
      UIDeterministicGuard.exitDeterministicSection();
    });

    test('recordViolation outside section does not set violation', () {
      UIDeterministicGuard.recordViolation('x');
      UIDeterministicGuard.enterDeterministicSection();
      UIDeterministicGuard.assertDeterministicContext();
      UIDeterministicGuard.exitDeterministicSection();
    });
  });
}
