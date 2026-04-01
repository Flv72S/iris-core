// G5 - Deprecation validator. Coherent with G1 and G3.

import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version_comparator.dart';
import 'package:iris_flutter_app/governance/versioning/version_scope_policy.dart';

import 'deprecation_descriptor.dart';

/// Thrown when deprecation descriptor is invalid.
class DeprecationValidationException implements Exception {
  DeprecationValidationException(this.message);
  final String message;
  @override
  String toString() => 'DeprecationValidationException: $message';
}

/// Validates deprecation descriptor: identifier, rationale, start < sunset, sunset valid for scope.
class DeprecationValidator {
  DeprecationValidator._();

  static void validateDeprecation(DeprecationDescriptor descriptor) {
    if (descriptor.identifier.trim().isEmpty) {
      throw DeprecationValidationException('identifier must be non-empty');
    }
    if (descriptor.rationale.trim().isEmpty) {
      throw DeprecationValidationException('rationale must be non-empty');
    }
    if (VersionComparator.compareTo(descriptor.startVersion, descriptor.sunsetVersion) >= 0) {
      throw DeprecationValidationException('startVersion must be less than sunsetVersion');
    }
    final scopeType = _toScopeType(descriptor.scope);
    if (!VersionScopePolicy.isValidVersionForScope(descriptor.sunsetVersion, scopeType)) {
      throw DeprecationValidationException(
        'sunsetVersion must be valid for scope ${descriptor.scope.name} (e.g. CORE requires X.0.0)',
      );
    }
  }

  static ScopeType _toScopeType(ChangeScope scope) {
    switch (scope) {
      case ChangeScope.core:
        return ScopeType.core;
      case ChangeScope.flow:
        return ScopeType.flow;
      case ChangeScope.plugin:
        return ScopeType.plugin;
    }
  }
}
