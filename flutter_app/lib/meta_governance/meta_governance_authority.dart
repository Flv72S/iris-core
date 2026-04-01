// H0 - Authority matrix. Role → allowed actions. Explicit; immutable.

import 'meta_governance_action.dart';
import 'meta_governance_role.dart';

/// Role → allowed actions. No implicit access.
class MetaGovernanceAuthority {
  MetaGovernanceAuthority._();

  static const _matrix = {
    MetaGovernanceRole.implementer: {MetaGovernanceAction.none},
    MetaGovernanceRole.governanceMaintainer: {MetaGovernanceAction.propose},
    MetaGovernanceRole.metaGovernor: {MetaGovernanceAction.review},
    MetaGovernanceRole.ratifier: {MetaGovernanceAction.approve, MetaGovernanceAction.reject},
  };

  static bool canPerform(MetaGovernanceRole role, MetaGovernanceAction action) {
    final allowed = _matrix[role];
    if (allowed == null) return false;
    return allowed.contains(action);
  }

  static Set<MetaGovernanceAction> allowedActionsFor(MetaGovernanceRole role) {
    return Set.unmodifiable(_matrix[role] ?? {MetaGovernanceAction.none});
  }
}
