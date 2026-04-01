// G1 - Version comparator. Deterministic order.

import 'version.dart';

class VersionComparator {
  VersionComparator._();

  static int compareTo(Version a, Version b) {
    if (a.major != b.major) return a.major.compareTo(b.major);
    if (a.minor != b.minor) return a.minor.compareTo(b.minor);
    if (a.patch != b.patch) return a.patch.compareTo(b.patch);
    return _comparePreRelease(a.preRelease, b.preRelease);
  }

  static int _comparePreRelease(String? preA, String? preB) {
    final aIsRelease = preA == null || preA.isEmpty;
    final bIsRelease = preB == null || preB.isEmpty;
    if (aIsRelease && bIsRelease) return 0;
    if (aIsRelease && !bIsRelease) return 1;
    if (!aIsRelease && bIsRelease) return -1;
    return (preA ?? '').compareTo(preB ?? '');
  }

  static bool isGreaterThan(Version a, Version b) => compareTo(a, b) > 0;
  static bool isLessThan(Version a, Version b) => compareTo(a, b) < 0;

  static bool isCompatibleWith(Version installed, Version required) {
    return installed.major == required.major && !isLessThan(installed, required);
  }

  static bool respectsCorePolicy(Version version) {
    return version.minor == 0 && version.patch == 0;
  }
}
