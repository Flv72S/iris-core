// H1 - Governance version. Immutable.

class GovernanceVersion {
  const GovernanceVersion({
    required this.major,
    required this.minor,
    required this.patch,
  })  : assert(major >= 0),
        assert(minor >= 0),
        assert(patch >= 0);

  final int major;
  final int minor;
  final int patch;

  @override
  String toString() => '$major.$minor.$patch';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceVersion &&
          major == other.major &&
          minor == other.minor &&
          patch == other.patch);

  @override
  int get hashCode => Object.hash(major, minor, patch);

  static int compare(GovernanceVersion a, GovernanceVersion b) {
    if (a.major != b.major) return a.major.compareTo(b.major);
    if (a.minor != b.minor) return a.minor.compareTo(b.minor);
    return a.patch.compareTo(b.patch);
  }

  static bool isLessThan(GovernanceVersion a, GovernanceVersion b) =>
      compare(a, b) < 0;
  static bool isGreaterThan(GovernanceVersion a, GovernanceVersion b) =>
      compare(a, b) > 0;
}
