// H1 - Compatibility between governance versions. Explicit only.

import 'governance_version.dart';

/// Declares compatibility between governance versions. No implicit compatibility.
class GovernanceCompatibility {
  GovernanceCompatibility(List<GovernanceVersionPair> pairs)
      : _pairs = _buildSet(pairs);

  static Set<_Pair> _buildSet(List<GovernanceVersionPair> pairs) {
    final set = <_Pair>{};
    for (final p in pairs) {
      set.add(_Pair(p.a, p.b));
      set.add(_Pair(p.b, p.a));
    }
    return set;
  }

  final Set<_Pair> _pairs;

  bool isCompatible(GovernanceVersion a, GovernanceVersion b) {
    if (a == b) return true;
    return _pairs.contains(_Pair(a, b));
  }
}

class GovernanceVersionPair {
  const GovernanceVersionPair(this.a, this.b);
  final GovernanceVersion a;
  final GovernanceVersion b;
}

class _Pair {
  const _Pair(this.a, this.b);
  final GovernanceVersion a;
  final GovernanceVersion b;
  @override
  bool operator ==(Object other) =>
      other is _Pair && a == other.a && b == other.b;
  @override
  int get hashCode => Object.hash(a, b);
}
