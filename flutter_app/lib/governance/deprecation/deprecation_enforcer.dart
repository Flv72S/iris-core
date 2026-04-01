// G5 - Sunset enforcement. Fail if currentVersion >= any sunsetVersion.

import 'package:iris_flutter_app/governance/versioning/version.dart';

import 'deprecation_registry.dart';

/// Thrown when current version is >= a registered sunset (element must be removed).
class DeprecationSunsetViolation implements Exception {
  DeprecationSunsetViolation(this.message);
  final String message;
  @override
  String toString() => 'DeprecationSunsetViolation: $message';
}

/// Enforces that no deprecation has passed its sunset at currentVersion.
class DeprecationEnforcer {
  DeprecationEnforcer._();

  /// Fails if currentVersion >= any descriptor's sunsetVersion.
  static void enforceSunset({
    required Version currentVersion,
    required DeprecationRegistry registry,
  }) {
    for (final d in registry.descriptors) {
      if (registry.isSunsetPassed(d, currentVersion)) {
        throw DeprecationSunsetViolation(
          'Deprecation ${d.identifier} sunset ${d.sunsetVersion} passed at $currentVersion',
        );
      }
    }
  }
}
