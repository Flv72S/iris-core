// G5 - Deprecation registry. Read-only; no duplicate identifier.

import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_comparator.dart';

import 'deprecation_descriptor.dart';

/// Thrown when registry has duplicate identifier or invalid input.
class DeprecationRegistryException implements Exception {
  DeprecationRegistryException(this.message);
  final String message;
  @override
  String toString() => 'DeprecationRegistryException: $message';
}

/// Read-only registry of deprecations. No duplicate identifiers.
class DeprecationRegistry {
  DeprecationRegistry(List<DeprecationDescriptor> descriptors) : _list = _validate(descriptors);

  static List<DeprecationDescriptor> _validate(List<DeprecationDescriptor> descriptors) {
    final seen = <String>{};
    for (final d in descriptors) {
      if (seen.contains(d.identifier)) {
        throw DeprecationRegistryException('Duplicate identifier: ${d.identifier}');
      }
      seen.add(d.identifier);
    }
    return List.unmodifiable(descriptors);
  }

  final List<DeprecationDescriptor> _list;

  List<DeprecationDescriptor> get descriptors => _list;

  DeprecationDescriptor? getByIdentifier(String identifier) {
    for (final d in _list) {
      if (d.identifier == identifier) return d;
    }
    return null;
  }

  List<DeprecationDescriptor> listByScope(ChangeScope scope) {
    return List.unmodifiable(_list.where((d) => d.scope == scope));
  }

  /// True if [identifier] is deprecated at [version] (version >= startVersion and version < sunsetVersion means "deprecated"; version >= sunsetVersion means "sunset passed").
  bool isDeprecated(String identifier, Version version) {
    final d = getByIdentifier(identifier);
    if (d == null) return false;
    return _versionInRange(version, d.startVersion, d.sunsetVersion);
  }

  static bool _versionInRange(Version v, Version start, Version sunset) {
    return (VersionComparator.compareTo(v, start) >= 0) && (VersionComparator.compareTo(v, sunset) < 0);
  }

  /// True if currentVersion >= sunsetVersion for this deprecation (element must be removed).
  bool isSunsetPassed(DeprecationDescriptor d, Version currentVersion) {
    return VersionComparator.compareTo(currentVersion, d.sunsetVersion) >= 0;
  }
}
