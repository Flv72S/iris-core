import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_logger.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_rules.dart';

void main() {
  test('GuardRunRecord passed', () {
    final r = GuardRunRecord(runId: '1', contextId: 'c1', violations: const [], runHash: 'h', passed: true);
    expect(r.passed, true);
    expect(r.violationCount, 0);
  });
  test('computeGuardRunHash deterministic', () {
    expect(computeGuardRunHash('a', 'b', [], {}), computeGuardRunHash('a', 'b', [], {}));
  });
  test('GuardRunRecordBuilder build', () {
    final rec = GuardRunRecordBuilder(runId: 'b', contextId: 'c').build();
    expect(rec.runId, 'b');
    expect(rec.passed, true);
  });
}
