// H0 - Authority matrix: each role has only allowed actions; no implicit access.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_action.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_authority.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';

void main() {
  test('implementer has only none', () {
    final allowed = MetaGovernanceAuthority.allowedActionsFor(MetaGovernanceRole.implementer);
    expect(allowed, {MetaGovernanceAction.none});
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.implementer, MetaGovernanceAction.approve), isFalse);
  });

  test('governanceMaintainer can propose, cannot approve', () {
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.governanceMaintainer, MetaGovernanceAction.propose), isTrue);
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.governanceMaintainer, MetaGovernanceAction.approve), isFalse);
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.governanceMaintainer, MetaGovernanceAction.reject), isFalse);
  });

  test('metaGovernor can review, cannot approve', () {
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.metaGovernor, MetaGovernanceAction.review), isTrue);
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.metaGovernor, MetaGovernanceAction.approve), isFalse);
  });

  test('ratifier can approve and reject', () {
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.ratifier, MetaGovernanceAction.approve), isTrue);
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.ratifier, MetaGovernanceAction.reject), isTrue);
    expect(MetaGovernanceAuthority.canPerform(MetaGovernanceRole.ratifier, MetaGovernanceAction.propose), isFalse);
  });
}
