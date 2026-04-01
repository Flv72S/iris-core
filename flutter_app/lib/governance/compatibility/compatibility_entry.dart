// G2 - Single compatibility entry. Immutable; declarative.

import 'compatibility_scope.dart';
import 'version_range.dart';

/// One explicit compatibility rule: source range ↔ target range for a scope.
class CompatibilityEntry {
  const CompatibilityEntry({
    required this.scope,
    required this.source,
    required this.target,
  });

  final CompatibilityScope scope;
  final VersionRange source;
  final VersionRange target;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CompatibilityEntry &&
          scope == other.scope &&
          source == other.source &&
          target == other.target);

  @override
  int get hashCode => Object.hash(scope, source, target);
}
