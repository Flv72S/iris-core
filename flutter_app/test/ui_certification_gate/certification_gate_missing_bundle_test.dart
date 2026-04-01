// Phase 11.8.1 - Null bundle yields closedMissingBundle.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_state.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_verifier.dart';

void main() {
  test('null bundle yields closedMissingBundle', () {
    final result = verifyCertificationGate(
      bundle: null,
      pack: null,
    );
    expect(result.state, CertificationGateState.closedMissingBundle);
    expect(result.reason, 'missing bundle');
    expect(result.bundleHash, isNull);
    expect(result.packHash, isNull);
  });
}
