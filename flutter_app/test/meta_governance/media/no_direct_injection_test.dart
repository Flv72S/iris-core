// G7 - No public API for direct policy or activation injection.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/enforcement/governance_registry.dart';

void main() {
  test('GovernanceRegistry has no public registerActivation (H5 hardening)', () {
    final registry = GovernanceRegistry();
    expect(registry.current(), isNull);
    expect(registry.history(), isEmpty);
    final hist = registry.history();
    expect(() => hist.clear(), throwsUnsupportedError);
  });
}
