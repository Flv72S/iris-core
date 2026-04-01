// H0 - Validator. Blocks self-approval and role separation.

import 'meta_governance_authority.dart';
import 'meta_governance_role.dart';

class MetaGovernanceValidationException implements Exception {
  MetaGovernanceValidationException(this.message);
  final String message;
  @override
  String toString() => 'MetaGovernanceValidationException: $message';
}

class MetaGovernanceValidator {
  MetaGovernanceValidator._();

  /// Validates that [actor] has [requiredRole]. Fails if actor != requiredRole (role separation).
  static void validateMetaGovernanceAction({
    required MetaGovernanceRole actor,
    required MetaGovernanceRole requiredRole,
  }) {
    if (actor != requiredRole) {
      throw MetaGovernanceValidationException(
        'Actor ${actor.name} cannot act as ${requiredRole.name}',
      );
    }
  }

  /// Validates that [ratifier] is not the same as [proponent]. Blocks self-ratification.
  static void validateNoSelfRatification({
    required MetaGovernanceRole ratifier,
    required MetaGovernanceRole proponent,
  }) {
    if (ratifier == proponent) {
      throw MetaGovernanceValidationException(
        'Self-ratification not allowed: ratifier and proponent cannot be the same role',
      );
    }
  }
}
