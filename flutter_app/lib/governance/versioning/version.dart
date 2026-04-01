// G1 - Version model. Immutable; deterministic; validated.

/// Immutable semantic version. Major, minor, patch required; pre-release optional.
class Version {
  const Version({
    required this.major,
    required this.minor,
    required this.patch,
    this.preRelease,
  })  : assert(major >= 0, 'major must be >= 0'),
        assert(minor >= 0, 'minor must be >= 0'),
        assert(patch >= 0, 'patch must be >= 0');

  final int major;
  final int minor;
  final int patch;
  final String? preRelease;

  @override
  String toString() {
    final base = '$major.$minor.$patch';
    if (preRelease != null && preRelease!.isNotEmpty) {
      return '$base-$preRelease';
    }
    return base;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Version &&
          major == other.major &&
          minor == other.minor &&
          patch == other.patch &&
          preRelease == other.preRelease);

  @override
  int get hashCode => Object.hash(major, minor, patch, preRelease);
}
