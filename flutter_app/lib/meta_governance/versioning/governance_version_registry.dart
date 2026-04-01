// H1 - Registry of governance versions. Read-only; currentVersion.

import 'governance_version.dart';

class GovernanceVersionRegistryException implements Exception {
  GovernanceVersionRegistryException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceVersionRegistryException: $message';
}

class GovernanceVersionRegistry {
  GovernanceVersionRegistry({
    required List<GovernanceVersion> versions,
    required GovernanceVersion currentVersion,
  })  : _versions = _validate(versions, currentVersion),
        _current = currentVersion;

  static List<GovernanceVersion> _validate(
      List<GovernanceVersion> versions, GovernanceVersion current) {
    final set = <String>{};
    for (final v in versions) {
      final key = v.toString();
      if (set.contains(key)) {
        throw GovernanceVersionRegistryException('Duplicate version: $key');
      }
      set.add(key);
    }
    if (!set.contains(current.toString())) {
      throw GovernanceVersionRegistryException(
          'currentVersion must be in versions list');
    }
    return List.unmodifiable(versions);
  }

  final List<GovernanceVersion> _versions;
  final GovernanceVersion _current;

  GovernanceVersion get currentVersion => _current;

  List<GovernanceVersion> listAllVersions() => List.unmodifiable(_versions);

  bool isKnownVersion(GovernanceVersion v) {
    for (final x in _versions) {
      if (x == v) return true;
    }
    return false;
  }
}
