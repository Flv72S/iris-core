/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Protocol versioning and compatibility.

import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';

class CompatibilityViolation extends DeterministicViolation {
  CompatibilityViolation([super.message]);
}

class DeterministicProtocolVersion {
  const DeterministicProtocolVersion({
    required this.major,
    required this.minor,
  });

  final int major;
  final int minor;

  static const DeterministicProtocolVersion initial =
      DeterministicProtocolVersion(major: 1, minor: 0);

  @override
  String toString() => '$major.$minor';

  /// Returns true if [other] can be loaded by this (current) version.
  /// - Major mismatch → false (incompatible).
  /// - [other].minor > this.minor → throws [CompatibilityViolation] (loading future minor).
  /// - Same major and other.minor <= this.minor → true.
  bool isCompatibleWith(DeterministicProtocolVersion other) {
    if (other.major != major) return false;
    if (other.minor > minor) {
      throw CompatibilityViolation(
        'Loading future minor version ${other.toString()} not allowed (current ${toString()})',
      );
    }
    return true;
  }
}

/// Validates that a snapshot version is compatible with current protocol version.
/// State.toMap() must preserve key naming; avoid removing keys or changing types without major bump.
class DeterministicSchemaGuard {
  DeterministicSchemaGuard._();

  static void validateSchemaCompatibility({
    required DeterministicProtocolVersion snapshotVersion,
    required DeterministicProtocolVersion currentVersion,
  }) {
    if (!currentVersion.isCompatibleWith(snapshotVersion)) {
      throw CompatibilityViolation(
        'Incompatible protocol: snapshot ${snapshotVersion.toString()} vs current ${currentVersion.toString()}',
      );
    }
  }
}
