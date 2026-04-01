// G1 - Version parser. Strict; no tolerance for invalid format.

import 'version.dart';

/// Thrown when the version string is invalid or ambiguous.
class VersionParseException implements Exception {
  VersionParseException(this.input, [this.reason]);
  final String input;
  final String? reason;
  @override
  String toString() => 'VersionParseException: $input${reason != null ? ' ($reason)' : ''}';
}

/// Parses version strings into [Version]. Rejects invalid or ambiguous input.
class VersionParser {
  VersionParser._();

  static final _releaseRegex = RegExp(r'^(\d+)\.(\d+)\.(\d+)$');
  static final _preReleaseRegex = RegExp(r'^(\d+)\.(\d+)\.(\d+)-(.+)$');
  static final _preReleaseIdRegex = RegExp(r'^[a-zA-Z0-9\-]+$');

  /// Parse [input] into [Version]. Throws [VersionParseException] if invalid.
  static Version parse(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      throw VersionParseException(input, 'empty');
    }

    Match? match = _preReleaseRegex.firstMatch(trimmed);
    if (match != null) {
      final major = int.parse(match[1]!);
      final minor = int.parse(match[2]!);
      final patch = int.parse(match[3]!);
      final pre = match[4]!;
      _validatePreRelease(pre);
      return Version(major: major, minor: minor, patch: patch, preRelease: pre);
    }

    match = _releaseRegex.firstMatch(trimmed);
    if (match != null) {
      final major = int.parse(match[1]!);
      final minor = int.parse(match[2]!);
      final patch = int.parse(match[3]!);
      return Version(major: major, minor: minor, patch: patch);
    }

    throw VersionParseException(input, 'invalid format: expected MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-preRelease');
  }

  static void _validatePreRelease(String pre) {
    final parts = pre.split('.');
    for (final part in parts) {
      if (part.isEmpty) throw VersionParseException(pre, 'empty pre-release segment');
      if (!_preReleaseIdRegex.hasMatch(part)) {
        throw VersionParseException(pre, 'invalid pre-release identifier: $part');
      }
    }
  }
}
