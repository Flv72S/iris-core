// G0 - Authority consistency: no forbidden in permitted; escalation path defined.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/governance_authority.dart';
import 'package:iris_flutter_app/governance/governance_registry.dart';

void main() {
  final authorities = canonicalAuthorities;

  test('no authority has a permitted action that is also forbidden', () {
    for (final a in authorities) {
      final permittedSet = a.permittedActions.toSet();
      final forbiddenSet = a.forbiddenActions.toSet();
      final overlap = permittedSet.intersection(forbiddenSet);
      expect(overlap, isEmpty, reason: '${a.authorityId.name} has overlap: $overlap');
    }
  });

  test('authorities with escalate in permitted have escalation target defined', () {
    final escalateActions = [
      ActionKind.escalateToCoreCouncil,
      ActionKind.escalateToFlowMaintainers,
    ];
    for (final a in authorities) {
      final hasEscalate = a.permittedActions.any((x) => escalateActions.contains(x));
      if (hasEscalate) {
        expect(a.escalationTarget, isNotNull, reason: '${a.authorityId.name} permits escalate but has no escalationTarget');
      }
    }
  });

  test('escalation targets reference existing authorities', () {
    final ids = AuthorityId.values.toSet();
    for (final a in authorities) {
      if (a.escalationTarget != null) {
        expect(ids.contains(a.escalationTarget), true, reason: '${a.authorityId.name} escalates to unknown ${a.escalationTarget}');
      }
    }
  });

  test('forbidden actions are not assigned in permitted list', () {
    for (final a in authorities) {
      for (final f in a.forbiddenActions) {
        expect(a.permittedActions.contains(f), false, reason: '${a.authorityId.name} forbids ${f.name} but also permits it');
      }
    }
  });
}
