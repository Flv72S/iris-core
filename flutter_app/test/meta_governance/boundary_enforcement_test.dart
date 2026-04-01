// H0 - Self-ratification block; determinism.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_validator.dart';

void main() {
  test('self-ratification: same role as ratifier and proponent fails', () {
    expect(
      () => MetaGovernanceValidator.validateNoSelfRatification(
        ratifier: MetaGovernanceRole.ratifier,
        proponent: MetaGovernanceRole.ratifier,
      ),
      throwsA(isA<MetaGovernanceValidationException>()),
    );
  });

  test('self-ratification: governanceMaintainer as proponent, same as ratifier fails', () {
    expect(
      () => MetaGovernanceValidator.validateNoSelfRatification(
        ratifier: MetaGovernanceRole.governanceMaintainer,
        proponent: MetaGovernanceRole.governanceMaintainer,
      ),
      throwsA(isA<MetaGovernanceValidationException>()),
    );
  });

  test('different ratifier and proponent passes', () {
    MetaGovernanceValidator.validateNoSelfRatification(
      ratifier: MetaGovernanceRole.ratifier,
      proponent: MetaGovernanceRole.governanceMaintainer,
    );
  });

  test('determinism: 100 validations same input same result', () {
    for (var i = 0; i < 100; i++) {
      MetaGovernanceValidator.validateMetaGovernanceAction(
        actor: MetaGovernanceRole.metaGovernor,
        requiredRole: MetaGovernanceRole.metaGovernor,
      );
      MetaGovernanceValidator.validateNoSelfRatification(
        ratifier: MetaGovernanceRole.ratifier,
        proponent: MetaGovernanceRole.governanceMaintainer,
      );
    }
  });
}
