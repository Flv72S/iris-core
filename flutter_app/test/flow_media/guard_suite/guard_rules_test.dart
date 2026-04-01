import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/guard_suite/guard_rules.dart';

void main() {
  group('GuardRule', () {
    test('toJson', () {
      const rule = StandardGuardRules.snapshotImmutability;
      expect(rule.toJson()['id'], 'GUARD-001');
    });
  });
  group('StandardGuardRules', () {
    test('all length', () => expect(StandardGuardRules.all.length, 10));
  });
  group('GuardRuleSet', () {
    test('disable/enable', () {
      final set = GuardRuleSet();
      set.disableRule('GUARD-001');
      expect(set.isEnabled('GUARD-001'), false);
      set.enableRule('GUARD-001');
      expect(set.isEnabled('GUARD-001'), true);
    });
  });
}
