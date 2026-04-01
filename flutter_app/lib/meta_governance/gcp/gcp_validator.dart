// H2 - GCP validator. Role, versions, scope.

import 'package:iris_flutter_app/meta_governance/meta_governance_action.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_authority.dart';
import 'package:iris_flutter_app/meta_governance/meta_governance_role.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version_registry.dart';

import 'gcp_descriptor.dart';
import 'gcp_scope.dart';

class GCPValidationException implements Exception {
  GCPValidationException(this.message);
  final String message;
  @override
  String toString() => 'GCPValidationException: $message';
}

class GCPValidator {
  GCPValidator._();

  static void validateGCP(
    GCPDescriptor gcp, {
    GovernanceVersionRegistry? versionRegistry,
  }) {
    if (gcp.title.trim().isEmpty) {
      throw GCPValidationException('title must be non-empty');
    }
    if (gcp.rationale.trim().isEmpty) {
      throw GCPValidationException('rationale must be non-empty');
    }
    if (gcp.riskAssessment.trim().isEmpty) {
      throw GCPValidationException('riskAssessment must be non-empty');
    }
    if (gcp.rollbackStrategy.trim().isEmpty) {
      throw GCPValidationException('rollbackStrategy must be non-empty');
    }
    if (GovernanceVersion.compare(gcp.fromVersion, gcp.toVersion) >= 0) {
      throw GCPValidationException('fromVersion must be less than toVersion');
    }
    if (gcp.proposerRole == MetaGovernanceRole.implementer) {
      throw GCPValidationException('implementer cannot propose a GCP');
    }
    if (!MetaGovernanceAuthority.canPerform(
        gcp.proposerRole, MetaGovernanceAction.propose)) {
      throw GCPValidationException(
          'proposerRole ${gcp.proposerRole.name} is not allowed to propose');
    }
    if (versionRegistry != null) {
      if (!versionRegistry.isKnownVersion(gcp.fromVersion)) {
        throw GCPValidationException(
            'fromVersion ${gcp.fromVersion} is not a known governance version');
      }
    }
  }
}
