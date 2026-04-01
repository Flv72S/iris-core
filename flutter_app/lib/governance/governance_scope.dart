// G0 - Governance scope. Immutable; declarative.

enum ScopeId {
  irisCore,
  irisFlow,
  flowExtensions,
  uxInterface,
  toolingCi,
}

enum ScopeMutability {
  immutable,
  controlled,
  evolvable,
}

class ScopeBoundaries {
  const ScopeBoundaries({
    required this.includes,
    required this.excludes,
  });

  final List<String> includes;
  final List<String> excludes;

  Map<String, Object> toJson() => {
        'includes': List<String>.from(includes),
        'excludes': List<String>.from(excludes),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ScopeBoundaries &&
          _listEq(includes, other.includes) &&
          _listEq(excludes, other.excludes));

  static bool _listEq(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(Object.hashAll(includes), Object.hashAll(excludes));
}

class GovernanceScope {
  const GovernanceScope({
    required this.scopeId,
    required this.mutability,
    required this.boundaries,
    this.description = '',
  });

  final ScopeId scopeId;
  final ScopeMutability mutability;
  final ScopeBoundaries boundaries;
  final String description;

  Map<String, Object> toJson() => {
        'scopeId': scopeId.name,
        'mutability': mutability.name,
        'boundaries': boundaries.toJson(),
        'description': description,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceScope &&
          scopeId == other.scopeId &&
          mutability == other.mutability &&
          boundaries == other.boundaries &&
          description == other.description);

  @override
  int get hashCode => Object.hash(scopeId, mutability, boundaries, description);
}
