// H0 - Role separation: governanceMaintainer cannot APPROVE.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_validator.dart';

void main() {
  test('governanceMaintainer attempting to act as ratifier fails', () {
    expect(
      () => MetaGovernanceValidator.validateMetaGovernanceAction(
        actor: MetaGovernanceRole.governanceMaintainer,
        requiredRole: MetaGovernanceRole.ratifier,
      ),
      throwsA(isA<MetaGovernanceValidationException>()),
    );
  });

  test('ratifier acting as ratifier passes', () {
    MetaGovernanceValidator.validateMetaGovernanceAction(
      actor: MetaGovernanceRole.ratifier,
      requiredRole: MetaGovernanceRole.ratifier,
    );
  });

  test('implementer cannot act as metaGovernor', () {
    expect(
      () => MetaGovernanceValidator.validateMetaGovernanceAction(
        actor: MetaGovernanceRole.implementer,
        requiredRole: MetaGovernanceRole.metaGovernor,
      ),
      throwsA(isA<MetaGovernanceValidationException>()),
    );
  });
}
