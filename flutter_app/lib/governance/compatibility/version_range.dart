// G2 - Version range. Min/max inclusive; MAJOR-level wildcard via range bounds.

import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_comparator.dart';

/// Inclusive range [minVersion, maxVersion]. No inference.
class VersionRange {
  const VersionRange({
    required this.minVersion,
    required this.maxVersion,
  });

  final Version minVersion;
  final Version maxVersion;

  bool contains(Version v) {
    return VersionComparator.compareTo(v, minVersion) >= 0 &&
        VersionComparator.compareTo(v, maxVersion) <= 0;
  }

  /// True if there exists a version in both this and [other].
  bool overlaps(VersionRange other) {
    return VersionComparator.compareTo(minVersion, other.maxVersion) <= 0 &&
        VersionComparator.compareTo(maxVersion, other.minVersion) >= 0;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is VersionRange &&
          minVersion == other.minVersion &&
          maxVersion == other.maxVersion);

  @override
  int get hashCode => Object.hash(minVersion, maxVersion);
}
